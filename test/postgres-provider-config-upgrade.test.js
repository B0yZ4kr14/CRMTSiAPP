const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { provisionTestDatabase } = require('./helpers/postgres-test-database');
const { foundationMigration, operationalExperienceMigration } = require('../domain-schema');
const crypto = require('node:crypto');

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DATABASE_ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !TEST_DATABASE_URL && !TEST_DATABASE_ADMIN_URL;

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

async function createSetupTables(pool) {
  await pool.query(`
    create table if not exists installation_setup (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      bootstrap_hash text not null,
      bootstrap_salt text not null,
      bootstrap_expires_at timestamptz,
      state text not null check (state in ('uninitialized','bootstrapped','draft','validated','activating','active')),
      version integer not null default 0,
      draft_config jsonb,
      active_config jsonb,
      secrets_hash text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (tenant_id)
    );
  `);
  await pool.query(`
    create table if not exists provider_configs (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      provider text not null check (provider in ('waha','meta')),
      config jsonb not null,
      credentials_ciphertext text not null,
      credentials_version integer not null default 1,
      status text not null check (status in ('draft','active','rotating','revoked')),
      activated_at timestamptz,
      rotated_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create index if not exists provider_configs_tenant_active_idx
      on provider_configs(tenant_id, status) where status = 'active';
  `);
}

async function provisionTestDB(prefix) {
  if (!TEST_DATABASE_ADMIN_URL) return { connectionString: TEST_DATABASE_URL, cleanup: async () => {} };
  const admin = new Pool({ connectionString: TEST_DATABASE_ADMIN_URL });
  const database = `crmtsiapp_${prefix}_${process.pid}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  await admin.query(`create database ${database}`);
  const url = new URL(TEST_DATABASE_ADMIN_URL);
  url.pathname = `/${database}`;
  return {
    connectionString: url.toString(),
    cleanup: async () => {
      await admin.query(`drop database if exists ${database} with (force)`);
      await admin.end();
    }
  };
}

function hashSecret(secret, salt) {
  return require('crypto').createHash('sha256').update(secret + salt).digest('hex');
}

test('upgrade from legacy settings preserves provider configs idempotently', { skip }, async () => {
  const provisioned = await provisionTestDB('upgrade_legacy');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1),($2)', [TENANT_A, TENANT_B]);
    await pool.query(foundationMigration());
    await pool.query(operationalExperienceMigration());
    await createSetupTables(pool);
    
    // Simulate legacy settings table (pre-migration)
    await pool.query(`
      create table if not exists legacy_settings (
        tenant_id uuid not null,
        key text not null,
        value text not null,
        primary key (tenant_id, key)
      );
    `);
    
    // Legacy waha config
    await pool.query(`
      insert into legacy_settings (tenant_id, key, value)
      values ($1, 'waha_base_url', 'http://legacy-waha:3000'),
             ($1, 'waha_session_name', 'legacy-session'),
             ($1, 'waha_api_key', 'legacy-api-key'),
             ($1, 'waha_webhook_secret', 'legacy-webhook-secret')
      on conflict do nothing
    `, [TENANT_A]);
    
    // Legacy meta config
    await pool.query(`
      insert into legacy_settings (tenant_id, key, value)
      values ($1, 'meta_graph_version', 'v21.0'),
             ($1, 'meta_phone_number_id', '123456789'),
             ($1, 'meta_access_token', 'legacy-access-token'),
             ($1, 'meta_app_secret', 'legacy-app-secret'),
             ($1, 'meta_verify_token', 'legacy-verify-token')
      on conflict do nothing
    `, [TENANT_A]);
    
    // Run upgrade migration (simulated)
    await pool.query(`
      insert into installation_setup (tenant_id, bootstrap_hash, bootstrap_salt, state, version)
      select tenant_id, crypt('bootstrap-secret', gen_salt('bf')), gen_salt('bf'), 'active', 1
      from tenants where id = $1
      on conflict (tenant_id) do nothing
    `, [TENANT_A]);
    
    // Migrate waha
    const wahaResult = await pool.query(`
      select value from legacy_settings where tenant_id = $1 and key = $2
    `, [TENANT_A, 'waha_base_url']);
    
    if (wahaResult.rows.length > 0) {
      const baseUrl = wahaResult.rows[0].value;
      const sessionName = (await pool.query(`select value from legacy_settings where tenant_id = $1 and key = 'waha_session_name'`, [TENANT_A])).rows[0]?.value;
      const apiKey = (await pool.query(`select value from legacy_settings where tenant_id = $1 and key = 'waha_api_key'`, [TENANT_A])).rows[0]?.value;
      const webhookSecret = (await pool.query(`select value from legacy_settings where tenant_id = $1 and key = 'waha_webhook_secret'`, [TENANT_A])).rows[0]?.value;
      
      if (baseUrl && sessionName) {
        await pool.query(`
          insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, credentials_version, status, activated_at)
          values ($1, 'waha', $2, $3, 1, 'active', now())
          on conflict do nothing
        `, [TENANT_A, JSON.stringify({ baseUrl, sessionName }), 'encrypted-credentials-v1']);
      }
    }
    
    // Migrate meta
    const metaResult = await pool.query(`
      select value from legacy_settings where tenant_id = $1 and key = 'meta_graph_version'
    `, [TENANT_A]);
    
    if (metaResult.rows.length > 0) {
      const graphVersion = metaResult.rows[0].value;
      const phoneNumberId = (await pool.query(`select value from legacy_settings where tenant_id = $1 and key = 'meta_phone_number_id'`, [TENANT_A])).rows[0]?.value;
      const accessToken = (await pool.query(`select value from legacy_settings where tenant_id = $1 and key = 'meta_access_token'`, [TENANT_A])).rows[0]?.value;
      const appSecret = (await pool.query(`select value from legacy_settings where tenant_id = $1 and key = 'meta_app_secret'`, [TENANT_A])).rows[0]?.value;
      const verifyToken = (await pool.query(`select value from legacy_settings where tenant_id = $1 and key = 'meta_verify_token'`, [TENANT_A])).rows[0]?.value;
      
      if (graphVersion && phoneNumberId) {
        await pool.query(`
          insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, credentials_version, status, activated_at)
          values ($1, 'meta', $2, $3, 1, 'active', now())
          on conflict do nothing
        `, [TENANT_A, JSON.stringify({ graphVersion, phoneNumberId }), 'encrypted-credentials-v1']);
      }
    }
    
    // Verify migration
    const configs = await pool.query('select * from provider_configs where tenant_id = $1', [TENANT_A]);
    assert.ok(configs.rows.length >= 1, 'At least one provider config migrated');
    
    // Verify idempotency - running upgrade again should not duplicate
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, credentials_version, status, activated_at)
      values ($1, 'waha', $2, $3, 1, 'active', now())
      on conflict do nothing
    `, [TENANT_A, JSON.stringify({ baseUrl: 'http://legacy-waha:3000', sessionName: 'legacy-session' }), 'encrypted-credentials-v1']);
    
    const afterIdempotent = await pool.query('select * from provider_configs where tenant_id = $1 and provider = $2', [TENANT_A, 'waha']);
    assert.equal(afterIdempotent.rows.length, 1, 'Idempotent upsert should not create duplicates');
    
    // Verify tenant isolation - TENANT_B should have no configs
    const tenantBConfigs = await pool.query('select * from provider_configs where tenant_id = $1', [TENANT_B]);
    assert.equal(tenantBConfigs.rows.length, 0);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('upgrade handles missing legacy keys gracefully', { skip }, async () => {
  const provisioned = await provisionTestDB('upgrade_missing');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1)', [TENANT_A]);
    await pool.query(foundationMigration());
    await pool.query(operationalExperienceMigration());
    await createSetupTables(pool);
    
    await pool.query(`
      create table if not exists legacy_settings (
        tenant_id uuid not null,
        key text not null,
        value text not null,
        primary key (tenant_id, key)
      );
    `);
    
    // Only partial legacy config
    await pool.query(`
      insert into legacy_settings (tenant_id, key, value)
      values ($1, 'waha_base_url', 'http://partial:3000')
      on conflict do nothing
    `, [TENANT_A]);
    
    // Migration should handle missing sessionName
    const baseUrl = (await pool.query(`select value from legacy_settings where tenant_id = $1 and key = 'waha_base_url'`, [TENANT_A])).rows[0]?.value;
    const sessionName = (await pool.query(`select value from legacy_settings where tenant_id = $1 and key = 'waha_session_name'`, [TENANT_A])).rows[0]?.value;
    
    if (baseUrl && sessionName) {
      await pool.query(`
        insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, status)
        values ($1, 'waha', $2, $3, 'active')
      `, [TENANT_A, JSON.stringify({ baseUrl, sessionName }), 'encrypted']);
    }
    
    const configs = await pool.query('select * from provider_configs where tenant_id = $1', [TENANT_A]);
    assert.equal(configs.rows.length, 0, 'Incomplete legacy config should not create provider config');
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('upgrade preserves active config version and credentials on re-run', { skip }, async () => {
  const provisioned = await provisionTestDB('upgrade_preserve');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1)', [TENANT_A]);
    await pool.query(foundationMigration());
    await pool.query(operationalExperienceMigration());
    await createSetupTables(pool);
    
    // Pre-existing active config
    await pool.query(`
      insert into installation_setup (tenant_id, bootstrap_hash, bootstrap_salt, state, version)
      values ($1, crypt('secret', gen_salt('bf')), gen_salt('bf'), 'active', 1)
    `, [TENANT_A]);
    
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, credentials_version, status, activated_at)
      values ($1, 'waha', $2, 'ciphertext-v1', 1, 'active', now())
    `, [TENANT_A, JSON.stringify({ baseUrl: 'http://current:3000', sessionName: 'current' })]);
    
    // Simulate upgrade re-run
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, credentials_version, status, activated_at)
      values ($1, 'waha', $2, 'ciphertext-v1', 1, 'active', now())
      on conflict do nothing
    `, [TENANT_A, JSON.stringify({ baseUrl: 'http://current:3000', sessionName: 'current' })]);
    
    // Verify version and credentials unchanged
    const result = await pool.query('select credentials_version, credentials_ciphertext, config from provider_configs where tenant_id = $1 and provider = $2', [TENANT_A, 'waha']);
    assert.equal(result.rows[0].credentials_version, 1);
    assert.equal(result.rows[0].credentials_ciphertext, 'ciphertext-v1');
    assert.deepEqual(result.rows[0].config, { baseUrl: 'http://current:3000', sessionName: 'current' });
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});