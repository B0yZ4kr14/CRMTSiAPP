const { Pool } = require('pg');
const crypto = require('crypto');

function createProviderMigration(pool, options = {}) {
  const { masterKey, logger = console } = options;

  const ALGORITHM = 'aes-256-gcm';
  const KEY_LENGTH = 32;
  const IV_LENGTH = 12;
  const TAG_LENGTH = 16;
  const SALT_LENGTH = 16;
  const ITERATIONS = 100000;

  function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  }

  function encrypt(plaintext, password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(password, salt);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, tag, ciphertext]).toString('base64');
  }

  async function migrateLegacyChannels(tenantId, actorId) {
    const client = await pool.connect();
    let migrated = 0;
    let skipped = 0;
    let errors = [];

    try {
      await client.query('begin');

      const channels = await client.query(`
        select c.id, c.provider, c.config, c.enabled,
               cc.secret_id, sv.ciphertext as credentials_ciphertext
        from channels c
        left join channel_credentials cc on cc.channel_id = c.id
        left join secret_versions sv on sv.secret_id = cc.secret_id and sv.id = cc.active_version_id
        where c.tenant_id = $1 and c.enabled = true
      `, [tenantId]);

      for (const channel of channels.rows) {
        try {
          if (!channel.provider || !['waha', 'meta'].includes(channel.provider)) {
            skipped++;
            continue;
          }

          let credentials = null;
          if (channel.credentials_ciphertext) {
            try {
              credentials = JSON.parse(channel.credentials_ciphertext);
            } catch {
              credentials = null;
            }
          }

          if (!credentials) {
            skipped++;
            continue;
          }

          const normalizedConfig = normalizeProviderConfig(channel.provider, channel.config);
          const normalizedCredentials = normalizeProviderCredentials(channel.provider, credentials);

          const fullValidation = validateFullProviderSetup(channel.provider, normalizedConfig, normalizedCredentials);
          if (!fullValidation.valid) {
            errors.push({ channelId: channel.id, error: fullValidation.error });
            continue;
          }

          const ciphertext = encrypt(JSON.stringify(normalizedCredentials), masterKey);

          await client.query(`
            insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, credentials_version, status, activated_at, created_at, updated_at)
            values ($1, $2, $3, $4, 1, 'active', now(), now(), now())
            on conflict (tenant_id, provider, status) where status = 'active' do update set
              config = excluded.config,
              credentials_ciphertext = excluded.credentials_ciphertext,
              credentials_version = provider_configs.credentials_version + 1,
              rotated_at = now(),
              updated_at = now()
          `, [tenantId, channel.provider, JSON.stringify(normalizedConfig), ciphertext]);

          await client.query(`
            insert into audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at)
            values (gen_random_uuid(), $1, $2, 'provider.migrated', 'provider_config', $3, $4, now())
          `, [tenantId, actorId, `${tenantId}:${channel.provider}`, JSON.stringify({ provider: channel.provider, legacyChannelId: channel.id })]);

          migrated++;
        } catch (e) {
          errors.push({ channelId: channel.id, error: e.message });
        }
      }

      await client.query('commit');
      return { migrated, skipped, errors };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async function migrateLegacySettings(tenantId, actorId) {
    const client = await pool.connect();
    let migrated = 0;
    let errors = [];

    try {
      await client.query('begin');

      const legacySettings = await client.query(`
        select key, value from legacy_settings where tenant_id = $1
      `, [tenantId]);

      const settingsByPrefix = {};
      for (const setting of legacySettings.rows) {
        const prefix = setting.key.split('_')[0];
        if (!settingsByPrefix[prefix]) settingsByPrefix[prefix] = {};
        const field = setting.key.replace(`${prefix}_`, '');
        settingsByPrefix[prefix][field] = setting.value;
      }

      for (const [prefix, data] of Object.entries(settingsByPrefix)) {
        try {
          if (!['waha', 'meta'].includes(prefix)) continue;

          const normalizedConfig = normalizeProviderConfig(prefix, data);
          const normalizedCredentials = normalizeProviderCredentials(prefix, data);

          const fullValidation = validateFullProviderSetup(prefix, normalizedConfig, normalizedCredentials);
          if (!fullValidation.valid) {
            errors.push({ prefix, error: fullValidation.error });
            continue;
          }

          const ciphertext = encrypt(JSON.stringify(normalizedCredentials), masterKey);

          await client.query(`
            insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, credentials_version, status, activated_at, created_at, updated_at)
            values ($1, $2, $3, $4, 1, 'active', now(), now(), now())
            on conflict (tenant_id, provider, status) where status = 'active' do update set
              config = excluded.config,
              credentials_ciphertext = excluded.credentials_ciphertext,
              credentials_version = provider_configs.credentials_version + 1,
              rotated_at = now(),
              updated_at = now()
          `, [tenantId, prefix, JSON.stringify(normalizedConfig), ciphertext]);

          await client.query(`
            insert into audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at)
            values (gen_random_uuid(), $1, $2, 'provider.migrated', 'provider_config', $3, $4, now())
          `, [tenantId, actorId, `${tenantId}:${prefix}`, JSON.stringify({ provider: prefix, legacySource: 'settings' })]);

          migrated++;
        } catch (e) {
          errors.push({ prefix, error: e.message });
        }
      }

      await client.query('commit');
      return { migrated, errors };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  function normalizeProviderConfig(provider, config) {
    if (!config || typeof config !== 'object') return config;
    const normalized = { ...config };
    if (provider === 'waha') {
      if (normalized.baseUrl) normalized.baseUrl = String(normalized.baseUrl).replace(/\/$/, '');
      if (normalized.sessionName) normalized.sessionName = String(normalized.sessionName).trim();
    } else if (provider === 'meta') {
      if (normalized.graphVersion) normalized.graphVersion = String(normalized.graphVersion).trim();
      if (normalized.phoneNumberId) normalized.phoneNumberId = String(normalized.phoneNumberId).trim();
    }
    return normalized;
  }

  function normalizeProviderCredentials(provider, credentials) {
    if (!credentials || typeof credentials !== 'object') return credentials;
    const normalized = { ...credentials };
    if (provider === 'waha') {
      if (normalized.apiKey) normalized.apiKey = String(normalized.apiKey).trim();
      if (normalized.webhookToken) normalized.webhookToken = String(normalized.webhookToken).trim();
    } else if (provider === 'meta') {
      if (normalized.accessToken) normalized.accessToken = String(normalized.accessToken).trim();
      if (normalized.appSecret) normalized.appSecret = String(normalized.appSecret).trim();
      if (normalized.verifyToken) normalized.verifyToken = String(normalized.verifyToken).trim();
    }
    return normalized;
  }

  function validateFullProviderSetup(provider, config, credentials) {
    if (!provider || !['waha', 'meta'].includes(provider)) {
      return { valid: false, error: 'PROVIDER_NOT_ALLOWLISTED' };
    }

    if (provider === 'waha') {
      if (!config?.baseUrl || !config?.sessionName) return { valid: false, error: 'MISSING_REQUIRED_CONFIG' };
      if (!credentials?.apiKey || !credentials?.webhookToken) return { valid: false, error: 'MISSING_REQUIRED_CREDENTIALS' };
      try {
        new URL(config.baseUrl);
      } catch {
        return { valid: false, error: 'INVALID_URL' };
      }
    } else if (provider === 'meta') {
      if (!config?.graphVersion || !config?.phoneNumberId) return { valid: false, error: 'MISSING_REQUIRED_CONFIG' };
      if (!credentials?.accessToken || !credentials?.appSecret || !credentials?.verifyToken) return { valid: false, error: 'MISSING_REQUIRED_CREDENTIALS' };
      if (!/^v\d+\.\d+$/.test(config.graphVersion)) return { valid: false, error: 'INVALID_GRAPH_VERSION' };
    }

    return { valid: true };
  }

  return {
    migrateLegacyChannels,
    migrateLegacySettings,
  };
}

module.exports = { createProviderMigration };