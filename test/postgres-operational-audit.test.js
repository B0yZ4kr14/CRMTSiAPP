const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');

const { foundationMigration, operationalExperienceMigration } = require('../domain-schema');
const { recordAuditEvent } = require('../modules/shared/audit-service');
const { createOperationContext } = require('../modules/shared/operation-context');

const connectionString = process.env.TEST_DATABASE_URL;
const adminConnectionString = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !connectionString && !adminConnectionString;

test('operational audit is append-only, tenant-scoped and redacts secret metadata', { skip }, async () => {
  let admin;
  let database;
  let effectiveConnection = connectionString;
  if (adminConnectionString) {
    admin = new Pool({ connectionString: adminConnectionString });
    database = `crmtsiapp_oe_${process.pid}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    await admin.query(`create database \"${database}\"`);
    const url = new URL(adminConnectionString);
    url.pathname = `/${database}`;
    effectiveConnection = url.toString();
  }
  const pool = new Pool({ connectionString: effectiveConnection });
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const actorId = 'audit-user';
  try {
    await pool.query(`create table if not exists users(
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
    await pool.query(`create table if not exists sessions(
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      token_hash text unique not null,
      user_agent text,
      ip text,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )`);
    await pool.query(`create table if not exists conversations(
      id text primary key,
      contact_name text not null,
      contact_phone text,
      status text not null default 'open',
      channel text not null default 'manual',
      last_message_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
    await pool.query(`create table if not exists conversation_messages(
      id text primary key,
      conversation_id text not null references conversations(id) on delete cascade,
      direction text not null,
      body text not null,
      provider_message_id text,
      created_at timestamptz not null default now()
    )`);
    await pool.query(`create table channels(id uuid primary key, provider text not null default 'waha', name text not null default 'channel', enabled boolean not null default true, config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now())`);
    await pool.query(`create table contacts(id bigint primary key, name text not null default 'contact', created_at timestamptz not null default now())`);
    await pool.query(`create table leads(id bigint primary key, title text not null default 'lead', created_at timestamptz not null default now())`);
    await pool.query(`create table companies(id bigint primary key, name text not null default 'company', created_at timestamptz not null default now())`);
    await pool.query(`create table teams(id uuid primary key, name text not null default 'team', created_at timestamptz not null default now())`);
    await pool.query(`create table queues(id uuid primary key, name text not null default 'queue', created_at timestamptz not null default now())`);
    await pool.query(`create table templates(id uuid primary key, name text not null default 'template', created_at timestamptz not null default now())`);
    await pool.query(`create table webhook_events(id uuid primary key, created_at timestamptz not null default now())`);
    await pool.query(`create table if not exists conversation_messages(id text primary key, conversation_id text, provider_message_id text, created_at timestamptz not null default now())`);
    await pool.query(`create table if not exists outbox_jobs(id uuid primary key, tenant_id uuid, status text not null default 'queued', available_at timestamptz not null default now(), created_at timestamptz not null default now())`);
    await pool.query(`create table if not exists delivery_events(id uuid primary key, tenant_id uuid, channel_id uuid, message_id text, job_id uuid references outbox_jobs(id) on delete cascade, provider_message_id text not null default '', status text not null default 'accepted', occurred_at timestamptz not null default now(), payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now())`);
    await pool.query(`create table if not exists failed_jobs(id uuid primary key, tenant_id uuid, outbox_job_id uuid, job_id uuid, reason text not null default '', payload jsonb not null default '{}'::jsonb, failed_at timestamptz not null default now(), created_at timestamptz not null default now())`);
    await pool.query(`create table if not exists settings(key text primary key,value text not null,updated_at timestamptz not null default now())`);
    await pool.query(foundationMigration());
    await pool.query(operationalExperienceMigration());
    await pool.query("insert into tenants(id,name,slug) values($1,'Audit Tenant','audit-tenant') on conflict(id) do nothing", [tenantId]);
    await pool.query("insert into users(id,login,email,name,role,active) values($1,'audit-user','audit@example.test','Audit User','admin',true) on conflict(id) do nothing", [actorId]);
    const context = createOperationContext({ tenantId, actorId, capabilities: ['audit:write'], requestId: 'audit-request' });
    const id = await recordAuditEvent(pool, {
      operationContext: context,
      action: 'provider.updated',
      resourceType: 'provider',
      resourceId: 'provider-a',
      metadata: { token: 'token-canary', nested: { password: 'password-canary' }, safe: 'visible' },
    });
    const { rows } = await pool.query('select tenant_id::text,actor_user_id,metadata from audit_events where id=$1', [id]);
    assert.equal(rows[0].tenant_id, tenantId);
    assert.equal(rows[0].actor_user_id, actorId);
    assert.equal(rows[0].metadata.safe, 'visible');
    assert.doesNotMatch(JSON.stringify(rows[0].metadata), /token-canary|password-canary/);
    await assert.rejects(pool.query('update audit_events set action=$1 where id=$2', ['tampered', id]), /immutable|append-only/i);
  } finally {
    await pool.query('delete from audit_events where false').catch(() => {});
    await pool.end();
  }
});
