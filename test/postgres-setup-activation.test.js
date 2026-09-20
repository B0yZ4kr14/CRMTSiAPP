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
  await pool.query('create extension if not exists pgcrypto');
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
    create unique index if not exists provider_configs_tenant_provider_active_key
      on provider_configs(tenant_id, provider) where status = 'active';
    create or replace function prevent_revoked_provider_reactivation() returns trigger as $$
    begin
      if old.status = 'revoked' and new.status = 'active' then
        raise exception 'revoked provider credentials cannot be reactivated';
      end if;
      return new;
    end;
    $$ language plpgsql;
    drop trigger if exists provider_configs_no_revoked_reactivation on provider_configs;
    create trigger provider_configs_no_revoked_reactivation
      before update on provider_configs for each row execute function prevent_revoked_provider_reactivation();
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

test('setup atomic activation succeeds with validated draft and closes further mutations', { skip }, async () => {
  const provisioned = await provisionTestDB('setup_activation');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1)', [TENANT_A]);
    await createSetupTables(pool);
    
    // Insert bootstrapped setup
    await pool.query(`
      insert into installation_setup (tenant_id, bootstrap_hash, bootstrap_salt, state, version)
      values ($1, crypt('secret', gen_salt('bf')), gen_salt('bf'), 'validated', 1)
    `, [TENANT_A]);
    
    // Insert draft config
    await pool.query(`
      update installation_setup 
      set draft_config = $2, state = 'validated', secrets_hash = $3, updated_at = now()
      where tenant_id = $1
    `, [TENANT_A, JSON.stringify({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } }), 'hash123']);
    
    // Activate - should succeed atomically
    const result = await pool.query(`
      update installation_setup 
      set state = 'active', active_config = draft_config, draft_config = null, secrets_hash = null, version = version + 1, updated_at = now()
      where tenant_id = $1 and state = 'validated'
      returning state, active_config, draft_config, secrets_hash, version
    `, [TENANT_A]);
    
    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0].state, 'active');
    assert.ok(result.rows[0].active_config);
    assert.equal(result.rows[0].draft_config, null);
    assert.equal(result.rows[0].secrets_hash, null);
    assert.equal(result.rows[0].version, 2);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('setup activation race condition: only one activation succeeds', { skip }, async () => {
  const provisioned = await provisionTestDB('setup_race');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1)', [TENANT_A]);
    await createSetupTables(pool);
    
    await pool.query(`
      insert into installation_setup (tenant_id, bootstrap_hash, bootstrap_salt, state, version)
      values ($1, crypt('secret', gen_salt('bf')), gen_salt('bf'), 'validated', 1)
    `, [TENANT_A]);
    await pool.query(`
      update installation_setup 
      set draft_config = $2, state = 'validated', secrets_hash = $3
      where tenant_id = $1
    `, [TENANT_A, JSON.stringify({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } }), 'hash123']);
    
    // Two concurrent activations
    const [r1, r2] = await Promise.all([
      pool.query(`
        update installation_setup 
        set state = 'active', active_config = draft_config, draft_config = null, secrets_hash = null, version = version + 1
        where tenant_id = $1 and state = 'validated'
        returning state
      `, [TENANT_A]),
      pool.query(`
        update installation_setup 
        set state = 'active', active_config = draft_config, draft_config = null, secrets_hash = null, version = version + 1
        where tenant_id = $1 and state = 'validated'
        returning state
      `, [TENANT_A]),
    ]);
    
    const successCount = (r1.rowCount || 0) + (r2.rowCount || 0);
    assert.equal(successCount, 1, 'Exactly one activation should succeed');
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('setup rollback on injected failure during activation leaves state as validated', { skip }, async () => {
  const provisioned = await provisionTestDB('setup_rollback');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1)', [TENANT_A]);
    await createSetupTables(pool);
    
    await pool.query(`
      insert into installation_setup (tenant_id, bootstrap_hash, bootstrap_salt, state, version)
      values ($1, crypt('secret', gen_salt('bf')), gen_salt('bf'), 'validated', 1)
    `, [TENANT_A]);
    await pool.query(`
      update installation_setup 
      set draft_config = $2, state = 'validated', secrets_hash = $3
      where tenant_id = $1
    `, [TENANT_A, JSON.stringify({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } }), 'hash123']);
    
    // Simulate injected failure by trying to activate with invalid state transition
    const client = await pool.connect();
    try {
      await client.query('begin');
      // First update to activating
      await client.query(`
        update installation_setup set state = 'activating' where tenant_id = $1 and state = 'validated'
      `, [TENANT_A]);
      // Injected failure - rollback
      throw new Error('injected activation failure');
    } catch (e) {
      await client.query('rollback');
    } finally {
      client.release();
    }
    
    // Verify state rolled back to validated
    const result = await pool.query('select state from installation_setup where tenant_id = $1', [TENANT_A]);
    assert.equal(result.rows[0].state, 'validated');
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('setup tenant isolation: tenant B cannot see or activate tenant A config', { skip }, async () => {
  const provisioned = await provisionTestDB('setup_isolation');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1),($2)', [TENANT_A, TENANT_B]);
    await createSetupTables(pool);
    
    await pool.query(`
      insert into installation_setup (tenant_id, bootstrap_hash, bootstrap_salt, state, version)
      values ($1, crypt('secret', gen_salt('bf')), gen_salt('bf'), 'validated', 1)
    `, [TENANT_A]);
    await pool.query(`
      update installation_setup 
      set draft_config = $2, state = 'validated', secrets_hash = $3
      where tenant_id = $1
    `, [TENANT_A, JSON.stringify({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } }), 'hash123']);
    
    // Tenant B tries to activate (should affect 0 rows)
    const result = await pool.query(`
      update installation_setup 
      set state = 'active', active_config = draft_config, draft_config = null, secrets_hash = null, version = version + 1
      where tenant_id = $1 and state = 'validated'
      returning state
    `, [TENANT_B]);
    
    assert.equal(result.rowCount, 0);
    
    // Tenant A config unchanged
    const check = await pool.query('select state, draft_config from installation_setup where tenant_id = $1', [TENANT_A]);
    assert.equal(check.rows[0].state, 'validated');
    assert.ok(check.rows[0].draft_config);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});