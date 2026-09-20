const { Pool } = require('pg');
const { createCredentialService } = require('./credential-service');
const { validateProviderConfig, validateProviderCredentials, normalizeProviderConfig, normalizeProviderCredentials, getAllowedProviders } = require('./provider-registry');
const { validateFullProviderSetup, testProviderConnection, sanitizeValidationError } = require('./provider-validation');

function createProviderService(pool, options = {}) {
  const { masterKey, testTimeout = 5000 } = options;

  const credentialService = createCredentialService(pool, { masterKey });

  async function listProviders(tenantId) {
    const result = await pool.query(`
        select pc.provider, pc.config, pc.credentials_version, pc.status, pc.activated_at, pc.rotated_at, pc.created_at
        from provider_configs pc
        where pc.tenant_id = $1
        order by pc.provider, pc.status desc
      `, [tenantId]);

      return Promise.all(result.rows.map(async row => ({
        provider: row.provider,
        config: row.config,
        credentialsVersion: row.credentials_version,
        status: row.status,
        activatedAt: row.activated_at,
        rotatedAt: row.rotated_at,
        createdAt: row.created_at,
        maskedHint: await credentialService.createMaskedHint(tenantId, row.provider, 'credentials'),
      })));
  }

  async function getProvider(tenantId, provider) {
    const result = await pool.query(`
      select pc.provider, pc.config, pc.credentials_version, pc.status, pc.activated_at, pc.rotated_at, pc.created_at
      from provider_configs pc
      where pc.tenant_id = $1 and pc.provider = $2
      order by pc.status desc
      limit 1
    `, [tenantId, provider]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      provider: row.provider,
      config: row.config,
      credentialsVersion: row.credentials_version,
      status: row.status,
      activatedAt: row.activated_at,
      rotatedAt: row.rotated_at,
      createdAt: row.created_at,
      maskedHint: await credentialService.createMaskedHint(tenantId, row.provider, 'credentials'),
    };
  }

  async function createProvider(tenantId, actorId, provider, config, credentials) {
    const configValidation = validateProviderConfig(provider, config);
    if (!configValidation.valid) throw new Error(configValidation.error);

    const credsValidation = validateProviderCredentials(provider, credentials);
    if (!credsValidation.valid) throw new Error(credsValidation.error);

    const normalizedConfig = normalizeProviderConfig(provider, config);
    const normalizedCredentials = normalizeProviderCredentials(provider, credentials);

    const fullValidation = validateFullProviderSetup(provider, normalizedConfig, normalizedCredentials);
    if (!fullValidation.valid) throw new Error(fullValidation.error);

    const client = await pool.connect();
    try {
      await client.query('begin');

      await client.query(`
        insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, credentials_version, status, created_at, updated_at)
        values ($1, $2, $3, $4, 1, 'draft', now(), now())
      `, [tenantId, provider, JSON.stringify(normalizedConfig), 'placeholder-ciphertext']);

      const credResult = await credentialService.storeCredential(tenantId, provider, 'credentials', JSON.stringify(normalizedCredentials));

      await client.query(`
        update provider_configs set credentials_version = $1, updated_at = now()
        where tenant_id = $2 and provider = $3
      `, [credResult.version, tenantId, provider]);

      await client.query('commit');

      return { provider, config: normalizedConfig, status: 'draft', credentialsVersion: credResult.version };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async function activateProvider(tenantId, actorId, provider) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      const current = await getProvider(tenantId, provider);
      if (!current) throw new Error('PROVIDER_NOT_FOUND');
      if (current.status === 'active') throw new Error('ALREADY_ACTIVE');
      if (current.status !== 'draft') throw new Error('INVALID_STATE_FOR_ACTIVATION');

      const testResult = await testProviderConnection(provider, current.config, await credentialService.getCredential(tenantId, provider, 'credentials'), { timeout: testTimeout });
      if (!testResult.valid) {
        await client.query('rollback');
        throw new Error(sanitizeValidationError(testResult.error));
      }

      await client.query(`
        update provider_configs set status = 'active', activated_at = now(), updated_at = now()
        where tenant_id = $1 and provider = $2
      `, [tenantId, provider]);

      await client.query(`
        insert into audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at)
        values (gen_random_uuid(), $1, $2, 'provider.activated', 'provider_config', $3, $4, now())
      `, [tenantId, actorId, `${tenantId}:${provider}`, JSON.stringify({ provider, configKeys: Object.keys(current.config) })]);

      await client.query('commit');
      return { provider, status: 'active', activatedAt: new Date() };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async function deactivateProvider(tenantId, actorId, provider) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      const current = await getProvider(tenantId, provider);
      if (!current) throw new Error('PROVIDER_NOT_FOUND');
      if (current.status !== 'active') throw new Error('NOT_ACTIVE');

      await client.query(`
        update provider_configs set status = 'revoked', updated_at = now()
        where tenant_id = $1 and provider = $2
      `, [tenantId, provider]);

      await client.query(`
        insert into audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at)
        values (gen_random_uuid(), $1, $2, 'provider.revoked', 'provider_config', $3, $4, now())
      `, [tenantId, actorId, `${tenantId}:${provider}`, JSON.stringify({ provider })]);

      await client.query('commit');
      return { provider, status: 'revoked' };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async function rotateCredentials(tenantId, actorId, provider, newCredentials) {
    const credsValidation = validateProviderCredentials(provider, newCredentials);
    if (!credsValidation.valid) throw new Error(credsValidation.error);

    const normalizedCredentials = normalizeProviderCredentials(provider, newCredentials);
    const fullValidation = validateFullProviderSetup(provider, await getProviderConfig(tenantId, provider), normalizedCredentials);
    if (!fullValidation.valid) throw new Error(fullValidation.error);

    await credentialService.rotateCredential(tenantId, provider, 'credentials', JSON.stringify(normalizedCredentials));

    await pool.query(`
      insert into audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at)
      values (gen_random_uuid(), $1, $2, 'provider.credentials_rotated', 'provider_config', $3, $4, now())
    `, [tenantId, actorId, `${tenantId}:${provider}`, JSON.stringify({ provider })]);

    return { provider, rotated: true };
  }

  async function testProvider(tenantId, provider) {
    const current = await getProvider(tenantId, provider);
    if (!current) throw new Error('PROVIDER_NOT_FOUND');

    const credentials = await credentialService.getCredential(tenantId, provider, 'credentials');
    if (!credentials) throw new Error('CREDENTIALS_NOT_FOUND');

    const testResult = await testProviderConnection(provider, current.config, credentials.plaintext, { timeout: testTimeout });
    return {
      provider,
      valid: testResult.valid,
      error: testResult.valid ? null : sanitizeValidationError(testResult.error),
      data: testResult.data,
    };
  }

  async function getProviderConfig(tenantId, provider) {
    const result = await pool.query(`
      select config from provider_configs
      where tenant_id = $1 and provider = $2
      order by status desc
      limit 1
    `, [tenantId, provider]);
    return result.rows[0]?.config || null;
  }

  async function getAllowedProvidersList() {
    return getAllowedProviders();
  }

  return {
    listProviders,
    getProvider,
    createProvider,
    activateProvider,
    deactivateProvider,
    rotateCredentials,
    testProvider,
    getProviderConfig,
    getAllowedProvidersList,
  };
}

module.exports = { createProviderService };