const crypto = require('crypto');

const ALLOWED_PROVIDERS = ['waha', 'meta'];

const PROVIDER_SCHEMAS = {
  waha: {
    required: ['baseUrl', 'sessionName'],
    properties: {
      baseUrl: { type: 'string', format: 'uri', pattern: '^https?://' },
      sessionName: { type: 'string', minLength: 1, maxLength: 100 },
    },
  },
  meta: {
    required: ['graphVersion', 'phoneNumberId'],
    properties: {
      graphVersion: { type: 'string', pattern: '^v\\d+\\.\\d+$' },
      phoneNumberId: { type: 'string', pattern: '^\\d+$' },
    },
  },
};

const SECRET_FIELDS = new Set([
  'accessToken', 'appSecret', 'verifyToken',
  'apiKey', 'webhookSecret', 'webhookToken',
  'password', 'secret', 'privateKey',
]);

function validateProviderConfig(config) {
  if (!config || !config.provider) {
    return { valid: false, error: 'PROVIDER_REQUIRED' };
  }
  if (!ALLOWED_PROVIDERS.includes(config.provider)) {
    return { valid: false, error: 'PROVIDER_NOT_ALLOWLISTED' };
  }
  const schema = PROVIDER_SCHEMAS[config.provider];
  for (const field of schema.required) {
    if (!config.config?.[field]) {
      return { valid: false, error: `MISSING_REQUIRED_FIELD_${field.toUpperCase()}` };
    }
  }
  for (const [field, rules] of Object.entries(schema.properties)) {
    const value = config.config?.[field];
    if (value === undefined) continue;
    if (rules.type === 'string' && typeof value !== 'string') {
      return { valid: false, error: `INVALID_TYPE_${field.toUpperCase()}` };
    }
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      return { valid: false, error: `INVALID_FORMAT_${field.toUpperCase()}` };
    }
    if (rules.minLength && value.length < rules.minLength) {
      return { valid: false, error: `TOO_SHORT_${field.toUpperCase()}` };
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return { valid: false, error: `TOO_LONG_${field.toUpperCase()}` };
    }
  }
  return { valid: true };
}

function validateWahaConfig(config) {
  const result = validateProviderConfig({ provider: 'waha', config });
  if (!result.valid) return result;

  try {
    const url = new URL(config.baseUrl);
    const hostname = url.hostname;

    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal' || hostname === 'metadata.azure.com') {
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
    const internalPorts = [22, 23, 25, 53, 110, 143, 993, 995, 3306, 5432, 6379, 8086, 9200, 27017];
    if (internalPorts.includes(port)) {
      return { valid: false, error: 'SSRF_BLOCKED_INTERNAL_PORT' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'INVALID_URL' };
  }
}

function redactConfig(config) {
  const redacted = JSON.parse(JSON.stringify(config));
  if (!redacted.config) return redacted;

  for (const field of SECRET_FIELDS) {
    if (redacted.config[field] !== undefined) {
      redacted.config[field] = '[REDACTED]';
    }
  }
  return redacted;
}

function sanitizeError(error) {
  const safeErrors = {
    'SSRF_BLOCKED_METADATA': 'Invalid provider configuration: metadata endpoint not allowed',
    'SSRF_BLOCKED_PRIVATE_IP': 'Invalid provider configuration: private IP not allowed',
    'SSRF_BLOCKED_PROTOCOL': 'Invalid provider configuration: protocol not allowed',
    'SSRF_BLOCKED_INTERNAL_PORT': 'Invalid provider configuration: internal port not allowed',
    'INVALID_URL': 'Invalid provider configuration: malformed URL',
    'MISSING_REQUIRED_FIELD_BASEURL': 'Missing required field: baseUrl',
    'MISSING_REQUIRED_FIELD_SESSIONNAME': 'Missing required field: sessionName',
    'MISSING_REQUIRED_FIELD_GRAPHVERSION': 'Missing required field: graphVersion',
    'MISSING_REQUIRED_FIELD_PHONENUMBERID': 'Missing required field: phoneNumberId',
    'PROVIDER_NOT_ALLOWLISTED': 'Provider not allowlisted',
    'INVALID_FORMAT_BASEURL': 'Invalid format for baseUrl',
    'INVALID_FORMAT_GRAPHVERSION': 'Invalid format for graphVersion',
    'INVALID_FORMAT_PHONENUMBERID': 'Invalid format for phoneNumberId',
  };
  return safeErrors[error] || 'Invalid provider configuration';
}

module.exports = {
  ALLOWED_PROVIDERS,
  PROVIDER_SCHEMAS,
  SECRET_FIELDS,
  validateProviderConfig,
  validateWahaConfig,
  redactConfig,
  sanitizeError,
};