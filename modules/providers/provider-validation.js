const { validateProviderConfig, validateProviderCredentials } = require('./provider-registry');

const INTERNAL_PORTS = [22, 23, 25, 53, 110, 143, 993, 995, 3306, 5432, 6379, 8086, 9200, 27017];
const BLOCKED_HOSTS = ['169.254.169.254', 'metadata.google.internal', 'metadata.azure.com', '169.254.169.254'];

function validateWahaEndpoint(baseUrl) {
  try {
    const url = new URL(baseUrl);
    const hostname = url.hostname;

    if (BLOCKED_HOSTS.includes(hostname)) {
      return { valid: false, error: 'SSRF_BLOCKED_METADATA' };
    }

    const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname);
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

    if (isPrivateIP && !isLocalhost) {
      return { valid: false, error: 'SSRF_BLOCKED_PRIVATE_IP' };
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'SSRF_BLOCKED_PROTOCOL' };
    }

    const port = parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'));
    if (INTERNAL_PORTS.includes(port)) {
      return { valid: false, error: 'SSRF_BLOCKED_INTERNAL_PORT' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'INVALID_URL' };
  }
}

function validateMetaEndpoint(graphVersion) {
  if (!/^v\d+\.\d+$/.test(graphVersion)) {
    return { valid: false, error: 'INVALID_FORMAT_GRAPHVERSION' };
  }
  return { valid: true };
}

async function testProviderConnection(provider, config, credentials, options = {}) {
  const { timeout = 5000 } = options;

  switch (provider) {
    case 'waha':
      return testWahaConnection(config, credentials, timeout);
    case 'meta':
      return testMetaConnection(config, credentials, timeout);
    default:
      return { valid: false, error: 'PROVIDER_NOT_ALLOWLISTED' };
  }
}

async function testWahaConnection(config, credentials, timeout) {
  const endpointValidation = validateWahaEndpoint(config.baseUrl);
  if (!endpointValidation.valid) {
    return { valid: false, error: endpointValidation.error };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/api/session/status/${config.sessionName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { valid: false, error: `WAHA_CONNECTION_FAILED_${response.status}` };
    }

    const data = await response.json();
    return { valid: true, data };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      return { valid: false, error: 'WAHA_CONNECTION_TIMEOUT' };
    }
    return { valid: false, error: 'WAHA_CONNECTION_ERROR' };
  }
}

async function testMetaConnection(config, credentials, timeout) {
  const graphValidation = validateMetaEndpoint(config.graphVersion);
  if (!graphValidation.valid) {
    return { valid: false, error: graphValidation.error };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { valid: false, error: `META_CONNECTION_FAILED_${response.status}` };
    }

    const data = await response.json();
    return { valid: true, data };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      return { valid: false, error: 'META_CONNECTION_TIMEOUT' };
    }
    return { valid: false, error: 'META_CONNECTION_ERROR' };
  }
}

function sanitizeValidationError(error) {
  const safeErrors = {
    'SSRF_BLOCKED_METADATA': 'Invalid configuration: metadata endpoint not allowed',
    'SSRF_BLOCKED_PRIVATE_IP': 'Invalid configuration: private IP not allowed',
    'SSRF_BLOCKED_PROTOCOL': 'Invalid configuration: protocol not allowed',
    'SSRF_BLOCKED_INTERNAL_PORT': 'Invalid configuration: internal port not allowed',
    'INVALID_URL': 'Invalid configuration: malformed URL',
    'INVALID_FORMAT_GRAPHVERSION': 'Invalid format for graphVersion',
    'MISSING_REQUIRED_FIELD_BASEURL': 'Missing required field: baseUrl',
    'MISSING_REQUIRED_FIELD_SESSIONNAME': 'Missing required field: sessionName',
    'MISSING_REQUIRED_FIELD_GRAPHVERSION': 'Missing required field: graphVersion',
    'MISSING_REQUIRED_FIELD_PHONENUMBERID': 'Missing required field: phoneNumberId',
    'MISSING_REQUIRED_FIELD_APIKEY': 'Missing required field: apiKey',
    'MISSING_REQUIRED_FIELD_WEBHOOKTOKEN': 'Missing required field: webhookToken',
    'MISSING_REQUIRED_FIELD_ACCESSTOKEN': 'Missing required field: accessToken',
    'MISSING_REQUIRED_FIELD_APPSECRET': 'Missing required field: appSecret',
    'MISSING_REQUIRED_FIELD_VERIFYTOKEN': 'Missing required field: verifyToken',
    'PROVIDER_NOT_ALLOWLISTED': 'Provider not allowlisted',
    'INVALID_FORMAT_BASEURL': 'Invalid format for baseUrl',
    'INVALID_FORMAT_PHONENUMBERID': 'Invalid format for phoneNumberId',
    'WAHA_CONNECTION_FAILED_400': 'WAHA connection failed: bad request',
    'WAHA_CONNECTION_FAILED_401': 'WAHA connection failed: invalid credentials',
    'WAHA_CONNECTION_FAILED_404': 'WAHA connection failed: session not found',
    'WAHA_CONNECTION_FAILED_500': 'WAHA connection failed: server error',
    'WAHA_CONNECTION_TIMEOUT': 'WAHA connection timed out',
    'WAHA_CONNECTION_ERROR': 'WAHA connection error',
    'META_CONNECTION_FAILED_400': 'Meta connection failed: bad request',
    'META_CONNECTION_FAILED_401': 'Meta connection failed: invalid credentials',
    'META_CONNECTION_FAILED_404': 'Meta connection failed: phone number not found',
    'META_CONNECTION_FAILED_500': 'Meta connection failed: server error',
    'META_CONNECTION_TIMEOUT': 'Meta connection timed out',
    'META_CONNECTION_ERROR': 'Meta connection error',
  };
  return safeErrors[error] || 'Configuration validation failed';
}

function validateFullProviderSetup(provider, config, credentials) {
  const configValidation = validateProviderConfig(provider, config);
  if (!configValidation.valid) return configValidation;

  const credsValidation = validateProviderCredentials(provider, credentials);
  if (!credsValidation.valid) return credsValidation;

  if (provider === 'waha') {
    const endpointValidation = validateWahaEndpoint(config.baseUrl);
    if (!endpointValidation.valid) return endpointValidation;
  } else if (provider === 'meta') {
    const graphValidation = validateMetaEndpoint(config.graphVersion);
    if (!graphValidation.valid) return graphValidation;
  }

  return { valid: true };
}

module.exports = {
  validateWahaEndpoint,
  validateMetaEndpoint,
  testProviderConnection,
  testWahaConnection,
  testMetaConnection,
  sanitizeValidationError,
  validateFullProviderSetup,
  INTERNAL_PORTS,
  BLOCKED_HOSTS,
};