const ALLOWED_PROVIDERS = ['waha', 'meta'];

const PROVIDER_SCHEMAS = {
  waha: {
    config: {
      required: ['baseUrl', 'sessionName'],
      properties: {
        baseUrl: { type: 'string', format: 'uri', pattern: '^https?://' },
        sessionName: { type: 'string', minLength: 1, maxLength: 100 },
      },
    },
    credentials: {
      required: ['apiKey', 'webhookToken'],
      properties: {
        apiKey: { type: 'string', minLength: 1 },
        webhookToken: { type: 'string', minLength: 1 },
      },
    },
  },
  meta: {
    config: {
      required: ['graphVersion', 'phoneNumberId'],
      properties: {
        graphVersion: { type: 'string', pattern: '^v\\d+\\.\\d+$' },
        phoneNumberId: { type: 'string', pattern: '^\\d+$' },
      },
    },
    credentials: {
      required: ['accessToken', 'appSecret', 'verifyToken'],
      properties: {
        accessToken: { type: 'string', minLength: 1 },
        appSecret: { type: 'string', minLength: 1 },
        verifyToken: { type: 'string', minLength: 1 },
      },
    },
  },
};

const ADAPTERS = {
  waha: {
    name: 'WAHA',
    description: 'WhatsApp HTTP API',
    validateConfig: (config) => validateSchema(config, PROVIDER_SCHEMAS.waha.config),
    validateCredentials: (creds) => validateSchema(creds, PROVIDER_SCHEMAS.waha.credentials),
    normalizeConfig: (config) => ({
      baseUrl: String(config.baseUrl).replace(/\/$/, ''),
      sessionName: String(config.sessionName).trim(),
    }),
    normalizeCredentials: (creds) => ({
      apiKey: String(creds.apiKey).trim(),
      webhookToken: String(creds.webhookToken).trim(),
    }),
  },
  meta: {
    name: 'Meta WhatsApp Business API',
    description: 'Meta Graph API for WhatsApp Business',
    validateConfig: (config) => validateSchema(config, PROVIDER_SCHEMAS.meta.config),
    validateCredentials: (creds) => validateSchema(creds, PROVIDER_SCHEMAS.meta.credentials),
    normalizeConfig: (config) => ({
      graphVersion: String(config.graphVersion).trim(),
      phoneNumberId: String(config.phoneNumberId).trim(),
    }),
    normalizeCredentials: (creds) => ({
      accessToken: String(creds.accessToken).trim(),
      appSecret: String(creds.appSecret).trim(),
      verifyToken: String(creds.verifyToken).trim(),
    }),
  },
};

function validateSchema(data, schema) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'INVALID_OBJECT' };
  }

  for (const field of schema.required) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return { valid: false, error: `MISSING_REQUIRED_FIELD_${field.toUpperCase()}` };
    }
  }

  for (const [field, rules] of Object.entries(schema.properties)) {
    const value = data[field];
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

function getAdapter(provider) {
  const normalized = String(provider || '').toLowerCase();
  if (!ALLOWED_PROVIDERS.includes(normalized)) {
    return null;
  }
  return ADAPTERS[normalized];
}

function getAllowedProviders() {
  return [...ALLOWED_PROVIDERS];
}

function getProviderSchema(provider) {
  const adapter = getAdapter(provider);
  if (!adapter) return null;
  return {
    config: PROVIDER_SCHEMAS[provider].config,
    credentials: PROVIDER_SCHEMAS[provider].credentials,
  };
}

function validateProviderConfig(provider, config) {
  const adapter = getAdapter(provider);
  if (!adapter) {
    return { valid: false, error: 'PROVIDER_NOT_ALLOWLISTED' };
  }
  return adapter.validateConfig(config);
}

function validateProviderCredentials(provider, credentials) {
  const adapter = getAdapter(provider);
  if (!adapter) {
    return { valid: false, error: 'PROVIDER_NOT_ALLOWLISTED' };
  }
  return adapter.validateCredentials(credentials);
}

function normalizeProviderConfig(provider, config) {
  const adapter = getAdapter(provider);
  if (!adapter) return config;
  return adapter.normalizeConfig(config);
}

function normalizeProviderCredentials(provider, credentials) {
  const adapter = getAdapter(provider);
  if (!adapter) return credentials;
  return adapter.normalizeCredentials(credentials);
}

module.exports = {
  ALLOWED_PROVIDERS,
  PROVIDER_SCHEMAS,
  ADAPTERS,
  getAdapter,
  getAllowedProviders,
  getProviderSchema,
  validateProviderConfig,
  validateProviderCredentials,
  normalizeProviderConfig,
  normalizeProviderCredentials,
};