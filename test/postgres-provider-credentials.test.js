const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { provisionTestDatabase } = require('./helpers/postgres-test-database');
const { operationalExperienceMigration } = require('../domain-schema');
const crypto = require('node:crypto');

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DATABASE_ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !TEST_DATABASE_URL && !TEST_DATABASE_ADMIN_URL;

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

async function createProviderTables(pool) {
  await pool.query('create extension if not exists pgcrypto');
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
    create or replace function guard_provider_status_transition() returns trigger as $$
    begin
      perform pg_advisory_xact_lock(hashtextextended(old.tenant_id::text || ':' || old.provider, 0));
      if old.status = 'revoked' and new.status = 'active' then
        return null;
      end if;
      if new.status = 'active' and exists (
        select 1 from provider_configs
        where tenant_id = new.tenant_id and provider = new.provider and status = 'active' and id <> old.id
      ) then
        return null;
      end if;
      return new;
    end;
    $$ language plpgsql;
    drop trigger if exists provider_configs_no_revoked_reactivation on provider_configs;
    create trigger provider_configs_no_revoked_reactivation
      before update on provider_configs for each row execute function guard_provider_status_transition();
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

test('provider credentials are tenant-scoped and isolated', { skip }, async () => {
  const provisioned = await provisionTestDB('provider_isolation');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1),($2)', [TENANT_A, TENANT_B]);
    await createProviderTables(pool);
    
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, status)
      values ($1, 'waha', $2, 'ciphertext-a', 'active')
    `, [TENANT_A, JSON.stringify({ baseUrl: 'http://localhost', sessionName: 's1' })]);
    
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, status)
      values ($1, 'waha', $2, 'ciphertext-b', 'active')
    `, [TENANT_B, JSON.stringify({ baseUrl: 'http://other', sessionName: 's2' })]);
    
    const resultA = await pool.query('select * from provider_configs where tenant_id = $1', [TENANT_A]);
    const resultB = await pool.query('select * from provider_configs where tenant_id = $1', [TENANT_B]);
    
    assert.equal(resultA.rows.length, 1);
    assert.equal(resultB.rows.length, 1);
    assert.equal(resultA.rows[0].credentials_ciphertext, 'ciphertext-a');
    assert.equal(resultB.rows[0].credentials_ciphertext, 'ciphertext-b');
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('only one active provider config per tenant per provider', { skip }, async () => {
  const provisioned = await provisionTestDB('provider_active_unique');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1)', [TENANT_A]);
    await createProviderTables(pool);
    
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, status)
      values ($1, 'waha', $2, 'ciphertext-1', 'active')
    `, [TENANT_A, JSON.stringify({ baseUrl: 'http://first', sessionName: 's1' })]);
    
    // Second active insert for same tenant/provider should fail or replace
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, status)
      values ($1, 'waha', $2, 'ciphertext-2', 'active')
      on conflict do nothing
    `, [TENANT_A, JSON.stringify({ baseUrl: 'http://second', sessionName: 's2' })]);
    
    const result = await pool.query('select * from provider_configs where tenant_id = $1 and provider = $2 and status = $3', [TENANT_A, 'waha', 'active']);
    assert.equal(result.rows.length, 1);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('provider credentials version increments on rotation', { skip }, async () => {
  const provisioned = await provisionTestDB('provider_rotation');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1)', [TENANT_A]);
    await createProviderTables(pool);
    
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, credentials_version, status)
      values ($1, 'waha', $2, 'ciphertext-v1', 1, 'active')
    `, [TENANT_A, JSON.stringify({ baseUrl: 'http://localhost', sessionName: 's1' })]);
    
    // Rotate credentials
    const result = await pool.query(`
      update provider_configs 
      set credentials_ciphertext = 'ciphertext-v2', credentials_version = credentials_version + 1, rotated_at = now(), updated_at = now()
      where tenant_id = $1 and provider = $2 and status = 'active'
      returning credentials_version, rotated_at
    `, [TENANT_A, 'waha']);
    assert.equal(result.rows[0].credentials_version, 2);
    assert.ok(result.rows[0].rotated_at);
    
    const check = await pool.query('select credentials_version from provider_configs where tenant_id = $1 and provider = $2', [TENANT_A, 'waha']);
    assert.equal(check.rows[0].credentials_version, 2);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('concurrent promotion of draft to active is serialized', { skip }, async () => {
  const provisioned = await provisionTestDB('provider_concurrent_promotion');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1)', [TENANT_A]);
    await createProviderTables(pool);
    
    // Insert two draft configs
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, status)
      values ($1, 'waha', $2, 'ciphertext-draft1', 'draft')
    `, [TENANT_A, JSON.stringify({ baseUrl: 'http://first', sessionName: 's1' })]);
    const draft1 = await pool.query('select id from provider_configs where tenant_id = $1 and status = $2', [TENANT_A, 'draft']);
    
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, status)
      values ($1, 'waha', $2, 'ciphertext-draft2', 'draft')
    `, [TENANT_A, JSON.stringify({ baseUrl: 'http://second', sessionName: 's2' })]);
    const draft2 = await pool.query('select id from provider_configs where tenant_id = $1 and status = $2 and id != $3', [TENANT_A, 'draft', draft1.rows[0].id]);
    
    // Two concurrent promotions to active
    const [r1, r2] = await Promise.all([
      pool.query(`
        update provider_configs 
        set status = 'active', activated_at = now(), updated_at = now()
        where id = $1 and status = 'draft'
        returning id
      `, [draft1.rows[0].id]),
      pool.query(`
        update provider_configs 
        set status = 'active', activated_at = now(), updated_at = now()
        where id = $1 and status = 'draft'
        returning id
      `, [draft2.rows[0].id]),
    ]);
    
    const successCount = (r1.rowCount || 0) + (r2.rowCount || 0);
    assert.equal(successCount, 1, 'Only one promotion should succeed');
    
    const active = await pool.query('select * from provider_configs where tenant_id = $1 and status = $2', [TENANT_A, 'active']);
    assert.equal(active.rows.length, 1);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('revoked credentials cannot be reactivated', { skip }, async () => {
  const provisioned = await provisionTestDB('provider_revoked');
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query('create table tenants(id uuid primary key)');
    await pool.query('insert into tenants(id) values($1)', [TENANT_A]);
    await createProviderTables(pool);
    
    await pool.query(`
      insert into provider_configs (tenant_id, provider, config, credentials_ciphertext, status)
      values ($1, 'waha', $2, 'ciphertext', 'active')
    `, [TENANT_A, JSON.stringify({ baseUrl: 'http://localhost', sessionName: 's1' })]);
    
    // Revoke
    await pool.query(`
      update provider_configs set status = 'revoked', updated_at = now() where tenant_id = $1 and provider = $2
    `, [TENANT_A, 'waha']);
    
    // Try to reactivate - should not allow
    const result = await pool.query(`
      update provider_configs set status = 'active', updated_at = now() where tenant_id = $1 and provider = $2 and status = 'revoked'
    `, [TENANT_A, 'waha']);
    
    assert.equal(result.rowCount, 0);
    
    const check = await pool.query('select status from provider_configs where tenant_id = $1 and provider = $2', [TENANT_A, 'waha']);
    assert.equal(check.rows[0].status, 'revoked');
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});