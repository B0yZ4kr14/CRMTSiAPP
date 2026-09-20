const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { provisionTestDatabase } = require('./helpers/postgres-test-database');
const { foundationMigration, operationalExperienceMigration } = require('../domain-schema');

async function createFoundationPrerequisites(pool) {
  await pool.query(`create table users(
    id text primary key,
    login text unique not null,
    email text unique not null,
    name text not null,
    role text not null default 'admin',
    password_salt text,
    password_hash text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await pool.query(`create table conversations(
    id text primary key,
    contact_name text not null default 'contact',
    contact_phone text,
    status text not null default 'open',
    channel text not null default 'manual',
    last_message_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await pool.query(`create table conversation_messages(
    id text primary key,
    conversation_id text not null references conversations(id) on delete cascade,
    direction text not null default 'inbound',
    body text not null default '',
    provider_message_id text,
    created_at timestamptz not null default now()
  )`);
}

const connectionString = process.env.TEST_DATABASE_URL;
const adminConnectionString = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !connectionString && !adminConnectionString;

test('audit logs are immutable and append-only', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_gate' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await createFoundationPrerequisites(pool);
    await pool.query(foundationMigration());
    await pool.query(operationalExperienceMigration());
    await pool.query("insert into tenants(id,name,slug) values($1,'TSi Telecom','default') on conflict(id) do nothing", ['00000000-0000-4000-8000-000000000001']);
    await pool.query("insert into users(id,login,email,name) values('admin','admin','admin@example.invalid','Admin')");
    await pool.query('insert into audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id) values (gen_random_uuid(), \'00000000-0000-4000-8000-000000000001\', \'admin\', \'create\', \'queue\', \'q1\')');
    await assert.rejects(pool.query('update audit_events set action = \'modified\''), /permission denied|not supported|immutable and append-only/i);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});
