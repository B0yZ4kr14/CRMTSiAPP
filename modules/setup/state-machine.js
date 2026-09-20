const crypto = require('crypto');

const ALLOWED_PROVIDERS = ['waha', 'meta'];

const SCHEMAS = {
  waha: { required: ['baseUrl', 'sessionName'] },
  meta: { required: ['graphVersion', 'phoneNumberId'] },
};

function createSetupStateMachine(options = {}) {
  const {
    bootstrapSecret,
    validationRateLimit = 10,
    activate = async () => {},
  } = options;

  let state = 'uninitialized';
  let version = 0;
  let draftConfig = null;
  let secretsHash = null;
  let validationAttempts = 0;
  let lastValidationAt = 0;

  function getState() { return state; }
  function getVersion() { return version; }
  function getDraft() { return { version, config: draftConfig, secretsHash }; }

  function hashSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  function transition(action, payload = {}) {
    switch (action) {
      case 'bootstrap': {
        if (state !== 'uninitialized') throw new Error('ALREADY_BOOTSTRAPPED');
        if (payload.tenantId) throw new Error('TENANT_MISMATCH');
        if (!payload.secret || hashSecret(payload.secret) !== hashSecret(bootstrapSecret)) {
          throw new Error('BOOTSTRAP_SECRET_INVALID');
        }
        state = 'bootstrapped';
        version = 1;
        validationAttempts = 0;
        break;
      }
      case 'activate': {
        if (state !== 'validated') throw new Error('INVALID_STATE_FOR_ACTIVATION');
        const result = activate(draftConfig);
        if (result instanceof Promise) {
          state = 'activating';
          return result.then(() => {
            state = 'active';
            draftConfig = null;
            secretsHash = null;
          }).catch(err => {
            state = 'validated';
            throw err;
          });
        }
        state = 'active';
        draftConfig = null;
        secretsHash = null;
        break;
      }
      default:
        throw new Error('UNKNOWN_ACTION');
    }
  }

  function setDraftConfig(config) {
    if (state !== 'bootstrapped' && state !== 'draft' && state !== 'validated') {
      throw new Error(state === 'active' ? 'ACTIVATION_CLOSED' : 'INVALID_STATE_FOR_DRAFT');
    }
    const provider = config?.provider;
    if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
      throw new Error('PROVIDER_NOT_ALLOWLISTED');
    }
    const schema = SCHEMAS[provider];
    for (const field of schema.required) {
      if (!config.config?.[field]) throw new Error(`MISSING_REQUIRED_FIELD_${field.toUpperCase()}`);
    }
    draftConfig = config;
    state = 'draft';
    validationAttempts = 0;
    lastValidationAt = 0;
  }

  function validateDraft() {
    if (state !== 'draft' && state !== 'validated') throw new Error('NO_DRAFT_TO_VALIDATE');
    const now = Date.now();
    if (now - lastValidationAt < 60000) {
      validationAttempts++;
      if (validationAttempts > validationRateLimit) {
        throw new Error('VALIDATION_RATE_EXCEEDED');
      }
    } else {
      validationAttempts = 1;
    }
    lastValidationAt = now;
    secretsHash = crypto.randomBytes(16).toString('hex');
    state = 'validated';
  }

  return {
    getState,
    getVersion,
    getDraft,
    transition,
    setDraftConfig,
    validateDraft,
  };
}

module.exports = { createSetupStateMachine };