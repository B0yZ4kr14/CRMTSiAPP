const crypto = require('crypto');
const { Pool } = require('pg');

const {
  validateProviderConfig,
  validateWahaConfig,
  redactConfig,
  sanitizeError,
} = require('./setup-validation');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const DEFAULT_BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RATE_LIMIT = 10;
const DEFAULT_RATE_WINDOW_MS = 60 * 1000;

const SETUP_STATES = ['uninitialized', 'bootstrapped', 'draft', 'validated', 'activating', 'active'];

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

function encryptCredentials(plaintext, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, ciphertext]).toString('base64');
}

function decryptCredentials(envelope, password) {
  const data = Buffer.from(envelope, 'base64');
  if (data.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
    throw new Error('ENVELOPE_TOO_SHORT');
  }
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

function hashSecret(secret, salt) {
  return crypto.createHash('sha256').update(secret + salt).digest('hex');
}

function timingSafeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function createSetupService(pool, options = {}) {
  const {
    bootstrapTtlMs = DEFAULT_BOOTSTRAP_TTL_MS,
    validationRateLimit = DEFAULT_RATE_LIMIT,
    validationRateWindowMs = DEFAULT_RATE_WINDOW_MS,
  } = options;

  async function getSetup(tenantId) {
    const result = await pool.query(
      `select * from installation_setup where tenant_id = $1`,
      [tenantId]
    );
    return result.rows[0] || null;
  }

  async function bootstrap(tenantId, { secret, bootstrapSecret, expiresAt }) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      const existing = await client.query(
        `select * from installation_setup where tenant_id = $1 for update`,
        [tenantId]
      );

      if (existing.rows.length > 0) {
        await client.query('rollback');
        throw new Error('ALREADY_BOOTSTRAPPED');
      }

      const salt = generateSalt();
      if (!secret || !bootstrapSecret || !timingSafeEqual(secret, bootstrapSecret)) {
        await client.query('rollback');
        throw new Error('BOOTSTRAP_SECRET_INVALID');
      }
      const bootstrapHash = hashSecret(secret, salt);
      const expires = expiresAt || new Date(Date.now() + bootstrapTtlMs);

      await client.query(`
        insert into installation_setup (tenant_id, bootstrap_hash, bootstrap_salt, bootstrap_expires_at, state, version)
        values ($1, $2, $3, $4, 'bootstrapped', 1)
      `, [tenantId, bootstrapHash, salt, expires]);

      await client.query('commit');
      return { state: 'bootstrapped', version: 1 };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async function verifyBootstrapSecret(tenantId, providedSecret) {
    const setup = await getSetup(tenantId);
    if (!setup || setup.state === 'uninitialized') {
      throw new Error('NOT_BOOTSTRAPPED');
    }
    if (setup.bootstrap_expires_at && new Date() > new Date(setup.bootstrap_expires_at)) {
      throw new Error('BOOTSTRAP_EXPIRED');
    }
    const expectedHash = hashSecret(providedSecret, setup.bootstrap_salt);
    if (expectedHash !== setup.bootstrap_hash) {
      throw new Error('BOOTSTRAP_SECRET_INVALID');
    }
    return true;
  }

  async function setDraftConfig(tenantId, actorId, config) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      const setup = await client.query(
        `select * from installation_setup where tenant_id = $1 for update`,
        [tenantId]
      );

      if (setup.rows.length === 0) {
        await client.query('rollback');
        throw new Error('NOT_BOOTSTRAPPED');
      }

      const current = setup.rows[0];
      if (!SETUP_STATES.includes(current.state)) {
        await client.query('rollback');
        throw new Error('INVALID_STATE');
      }
      if (current.state === 'active') {
        await client.query('rollback');
        throw new Error('ACTIVATION_CLOSED');
      }
      if (current.state === 'activating') {
        await client.query('rollback');
        throw new Error('ACTIVATION_IN_PROGRESS');
      }

      const validation = validateProviderConfig(config);
      if (!validation.valid) {
        await client.query('rollback');
        throw new Error(validation.error);
      }

      if (config.provider === 'waha') {
        const wahaValidation = validateWahaConfig(config.config);
        if (!wahaValidation.valid) {
          await client.query('rollback');
          throw new Error(wahaValidation.error);
        }
      }

      await client.query(`
        update installation_setup
        set draft_config = $1, state = 'draft', version = version + 1, updated_at = now()
        where tenant_id = $2
      `, [JSON.stringify(config), tenantId]);

      await client.query('commit');
      return { state: 'draft', version: current.version + 1 };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async function validateDraft(tenantId, actorId) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      const setup = await client.query(
        `select * from installation_setup where tenant_id = $1 for update`,
        [tenantId]
      );

      if (setup.rows.length === 0) {
        await client.query('rollback');
        throw new Error('NOT_BOOTSTRAPPED');
      }

      const current = setup.rows[0];
      if (current.state !== 'draft' && current.state !== 'validated') {
        await client.query('rollback');
        throw new Error('NO_DRAFT_TO_VALIDATE');
      }

      const now = Date.now();
      const lastValidationAt = current.last_validation_at ? new Date(current.last_validation_at).getTime() : 0;
      const validationAttempts = current.validation_attempts || 0;

      if (now - lastValidationAt < validationRateWindowMs) {
        if (validationAttempts >= validationRateLimit) {
          await client.query('rollback');
          throw new Error('VALIDATION_RATE_EXCEEDED');
        }
      }

      await client.query(`
        update installation_setup
        set state = 'validated',
            secrets_hash = $1,
            validation_attempts = $2,
            last_validation_at = now(),
            updated_at = now()
        where tenant_id = $3
      `, [crypto.randomBytes(16).toString('hex'), 
         (now - lastValidationAt < validationRateWindowMs) ? validationAttempts + 1 : 1,
         tenantId]);

      await client.query('commit');
      return { state: 'validated', secretsHash: crypto.randomBytes(16).toString('hex') };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async function activate(tenantId, actorId) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      const setup = await client.query(
        `select * from installation_setup where tenant_id = $1 for update`,
        [tenantId]
      );

      if (setup.rows.length === 0) {
        await client.query('rollback');
        throw new Error('NOT_BOOTSTRAPPED');
      }

      const current = setup.rows[0];
      if (current.state !== 'validated') {
        await client.query('rollback');
        throw new Error('INVALID_STATE_FOR_ACTIVATION');
      }
      if (!current.draft_config) {
        await client.query('rollback');
        throw new Error('NO_DRAFT_TO_VALIDATE');
      }

      await client.query(`
        update installation_setup
        set state = 'activating', updated_at = now()
        where tenant_id = $1
      `, [tenantId]);

      await client.query('commit');

      try {
        const draftConfig = current.draft_config;
        await persistProviderConfigs(pool, tenantId, draftConfig, actorId);

        await pool.query(`
          update installation_setup
          set state = 'active',
              active_config = draft_config,
              draft_config = null,
              secrets_hash = null,
              version = version + 1,
              updated_at = now()
          where tenant_id = $1
        `, [tenantId]);

        return { state: 'active' };
      } catch (e) {
        await pool.query(`
          update installation_setup
          set state = 'validated', updated_at = now()
          where tenant_id = $1
        `, [tenantId]);
        throw e;
      }
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async function persistProviderConfigs(pool, tenantId, config, actorId) {
    const provider = config.provider;
    const credentialsCiphertext = encryptCredentials(
      JSON.stringify(config.config), 
      crypto.randomBytes(32).toString('hex')
    );

    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, credentials_version, status, activated_at)
      values ($1, $2, $3, $4, 1, 'active', now())
      on conflict (tenant_id, provider, status) where status = 'active' do update set
        config = excluded.config,
        credentials_ciphertext = excluded.credentials_ciphertext,
        credentials_version = provider_configs.credentials_version + 1,
        rotated_at = now(),
        updated_at = now()
    `, [tenantId, provider, JSON.stringify(config.config), credentialsCiphertext]);

    await pool.query(`
      insert into audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at)
      values (gen_random_uuid(), $1, $2, 'provider.config.activated', 'provider_config', $3, $4, now())
    `, [tenantId, actorId, `${tenantId}:${provider}`, JSON.stringify({ provider, configKeys: Object.keys(config.config) })]);
  }

  async function rotateBootstrapSecret(tenantId, actorId, { oldSecret, newSecret }) {
    await verifyBootstrapSecret(tenantId, oldSecret);

    const salt = generateSalt();
    const newHash = hashSecret(newSecret, salt);

    await pool.query(`
      update installation_setup
      set bootstrap_hash = $1, bootstrap_salt = $2, updated_at = now()
      where tenant_id = $3
    `, [newHash, salt, tenantId]);

    await pool.query(`
      insert into audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at)
      values (gen_random_uuid(), $1, $2, 'bootstrap.secret.rotated', 'installation_setup', $3, '{}', now())
    `, [tenantId, actorId, tenantId]);
  }

  async function getDraftConfig(tenantId) {
    const setup = await getSetup(tenantId);
    if (!setup) return null;
    return {
      state: setup.state,
      version: setup.version,
      config: setup.draft_config,
      secretsHash: setup.secrets_hash,
    };
  }

  async function getActiveConfig(tenantId) {
    const setup = await getSetup(tenantId);
    if (!setup) return null;
    return {
      state: setup.state,
      version: setup.version,
      config: setup.active_config,
    };
  }

  async function getSetupStatus(tenantId) {
    const setup = await getSetup(tenantId);
    if (!setup) return { state: 'uninitialized', version: 0 };
    return {
      state: setup.state,
      version: setup.version,
      bootstrapExpiresAt: setup.bootstrap_expires_at,
    };
  }

  return {
    bootstrap,
    verifyBootstrapSecret,
    setDraftConfig,
    validateDraft,
    activate,
    rotateBootstrapSecret,
    getDraftConfig,
    getActiveConfig,
    getSetupStatus,
    encryptCredentials,
    decryptCredentials,
  };
}

module.exports = { createSetupService };