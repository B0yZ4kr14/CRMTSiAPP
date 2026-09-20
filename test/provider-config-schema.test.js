const test = require('node:test');
const assert = require('node:assert/strict');

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

test('provider config schema rejects unknown provider', () => {
  const result = validateProviderConfig({ provider: 'unknown', config: {} });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'PROVIDER_NOT_ALLOWLISTED');
});

test('provider config schema rejects missing provider', () => {
  const result = validateProviderConfig({ config: { baseUrl: 'http://localhost' } });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'PROVIDER_REQUIRED');
});

test('provider config schema validates waha required fields', () => {
  let result = validateProviderConfig({ provider: 'waha', config: { baseUrl: 'http://localhost' } });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'MISSING_REQUIRED_FIELD_SESSIONNAME');
  
  result = validateProviderConfig({ provider: 'waha', config: { sessionName: 's1' } });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'MISSING_REQUIRED_FIELD_BASEURL');
  
  result = validateProviderConfig({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } });
  assert.equal(result.valid, true);
});

test('provider config schema validates meta required fields', () => {
  let result = validateProviderConfig({ provider: 'meta', config: { graphVersion: 'v22.0' } });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'MISSING_REQUIRED_FIELD_PHONENUMBERID');
  
  result = validateProviderConfig({ provider: 'meta', config: { phoneNumberId: '123456' } });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'MISSING_REQUIRED_FIELD_GRAPHVERSION');
  
  result = validateProviderConfig({ provider: 'meta', config: { graphVersion: 'v22.0', phoneNumberId: '123456' } });
  assert.equal(result.valid, true);
});

test('provider config schema validates waha baseUrl format', () => {
  let result = validateProviderConfig({ provider: 'waha', config: { baseUrl: 'not-a-url', sessionName: 's1' } });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'INVALID_FORMAT_BASEURL');
  
  result = validateProviderConfig({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } });
  assert.equal(result.valid, true);
  
  result = validateProviderConfig({ provider: 'waha', config: { baseUrl: 'https://api.example.com', sessionName: 's1' } });
  assert.equal(result.valid, true);
});

test('provider config schema validates meta graphVersion format', () => {
  let result = validateProviderConfig({ provider: 'meta', config: { graphVersion: '22.0', phoneNumberId: '123456' } });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'INVALID_FORMAT_GRAPHVERSION');
  
  result = validateProviderConfig({ provider: 'meta', config: { graphVersion: 'v22.0', phoneNumberId: '123456' } });
  assert.equal(result.valid, true);
  
  result = validateProviderConfig({ provider: 'meta', config: { graphVersion: 'v21.5', phoneNumberId: '123456' } });
  assert.equal(result.valid, true);
});

test('provider config schema validates meta phoneNumberId format', () => {
  let result = validateProviderConfig({ provider: 'meta', config: { graphVersion: 'v22.0', phoneNumberId: 'abc' } });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'INVALID_FORMAT_PHONENUMBERID');
  
  result = validateProviderConfig({ provider: 'meta', config: { graphVersion: 'v22.0', phoneNumberId: '123456789' } });
  assert.equal(result.valid, true);
});

test('provider config schema validates string types', () => {
  const result = validateProviderConfig({ provider: 'waha', config: { baseUrl: 123, sessionName: 's1' } });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'INVALID_TYPE_BASEURL');
});

test('provider config schema validates length constraints', () => {
  let result = validateProviderConfig({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: '' } });
  assert.equal(result.valid, false);
  assert.match(result.error, /MISSING_REQUIRED_FIELD_SESSIONNAME|TOO_SHORT_SESSIONNAME/);
  
  result = validateProviderConfig({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 'a'.repeat(101) } });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'TOO_LONG_SESSIONNAME');
});

test('provider config schema allows extra fields not in schema', () => {
  const result = validateProviderConfig({ 
    provider: 'waha', 
    config: { baseUrl: 'http://localhost', sessionName: 's1', extraField: 'ignored' } 
  });
  assert.equal(result.valid, true);
});

test('provider config schema rejects null config', () => {
  const result = validateProviderConfig({ provider: 'waha', config: null });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'MISSING_REQUIRED_FIELD_BASEURL');
});