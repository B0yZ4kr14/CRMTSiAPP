const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { tenantMigration, DEFAULT_TENANT_ID } = require('../domain-schema');
const { createTenantInboxStore } = require('../tenant-inbox-store');

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DATABASE_ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL;
const TENANT_B = '22222222-2222-4222-8222-222222222222';

async function provisionDatabase() {
  if (!TEST_DATABASE_ADMIN_URL) return { connectionString: TEST_DATABASE_URL, cleanup: async () => {} };
  const admin = new Pool({ connectionString: TEST_DATABASE_ADMIN_URL });
  const database = `crmtsiapp_tenant_${process.pid}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  await admin.query(`create database ${database}`);
  const url = new URL(TEST_DATABASE_ADMIN_URL);
  url.pathname = `/${database}`;
  return {
    connectionString: url.toString(),
    cleanup: async () => {
      await admin.query(`drop database if exists ${database} with (force)`);
      await admin.end();
    },
  };
}

async function withDatabase(fn) {
  const provisioned = await provisionDatabase();
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query(`create table users(id text primary key)`);
    await pool.query(`create table roles(name text primary key)`);
    await pool.query(`insert into roles(name) values('admin'),('agent')`);
    await pool.query(`create table user_roles(user_id text not null references users(id),role_name text not null references roles(name),primary key(user_id,role_name))`);
    await pool.query(`create table settings(key text primary key,value text not null)`);
    await pool.query(`create table sessions(id text primary key, user_id text not null references users(id))`);
    await pool.query(`create table conversations(
      id text primary key,
      contact_name text not null,
      contact_phone text,
      status text not null default 'open',
      channel text not null default 'manual',
      last_message_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
    await pool.query(`create table conversation_messages(
      id text primary key,
      conversation_id text not null references conversations(id),
      direction text not null,
      body text not null,
      created_at timestamptz not null default now()
    )`);
    await pool.query(`create table audit_events(
      id uuid primary key,
      actor_user_id text references users(id),
      action text not null,
      resource_type text not null,
      resource_id text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )`);
    await pool.query(`create table contacts(id bigserial primary key)`);
    await pool.query(`create table leads(id bigserial primary key)`);
    await pool.query(`create table companies(id bigserial primary key)`);
    await pool.query(`create table teams(id uuid primary key,name text not null default 'team')`);
    await pool.query(`create table queues(id uuid primary key,name text not null default 'queue')`);
    await pool.query(`create table templates(id uuid primary key,name text not null default 'template')`);
    await pool.query(`create table channels(id uuid primary key)`);
    await pool.query(`create table tags(id uuid primary key,name text not null default 'tag')`);
    await pool.query(`create table outbox_jobs(id uuid primary key,conversation_id text)`);
    await pool.query(`create table delivery_events(id uuid primary key,job_id uuid)`);
    await pool.query(`create table failed_jobs(id uuid primary key,outbox_job_id uuid,job_id uuid)`);
    await pool.query(`create table conversation_assignments(id uuid primary key,conversation_id text)`);
    await pool.query(`create table internal_notes(id uuid primary key,conversation_id text)`);
    await pool.query(`create table canned_responses(id uuid primary key)`);
    await pool.query(`create table automation_rules(id uuid primary key)`);
    await pool.query(`create table automation_runs(id uuid primary key)`);
    await pool.query(`create table privacy_requests(id uuid primary key)`);
    await pool.query(`create table retention_runs(id uuid primary key)`);
    await pool.query(`create table metrics_rollups(id uuid primary key)`);
    await pool.query(`insert into users(id) values('user-a'),('user-b')`);
    await pool.query(tenantMigration());
    await pool.query(`create table realtime_events(
      sequence bigint generated always as identity primary key,
      id uuid not null unique,
      tenant_id uuid not null references tenants(id) on delete cascade,
      event_type text not null,
      aggregate_type text not null,
      aggregate_id text not null,
      aggregate_version bigint not null,
      payload jsonb not null,
      audience jsonb not null default '{}'::jsonb,
      occurred_at timestamptz not null default now(),
      expires_at timestamptz not null,
      unique(tenant_id,aggregate_type,aggregate_id,aggregate_version)
    )`);
    await pool.query(`insert into tenants(id,name,slug) values($1,'Tenant B','tenant-b')`, [TENANT_B]);
    await pool.query(`insert into tenant_memberships(tenant_id,user_id,active) values($1,'user-b',true)`, [TENANT_B]);
    await fn(pool);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
}

const skip = !TEST_DATABASE_URL && !TEST_DATABASE_ADMIN_URL;

test('legacy rows and memberships are backfilled into the default tenant', { skip }, async () => {
  await withDatabase(async pool => {
    const membership = await pool.query('select tenant_id from tenant_memberships where user_id=$1', ['user-a']);
    assert.equal(membership.rows[0].tenant_id, DEFAULT_TENANT_ID);
    const columns = await pool.query(`select table_name,column_name,is_nullable from information_schema.columns where table_name in ('conversations','conversation_messages') and column_name='tenant_id' order by table_name`);
    assert.deepEqual(columns.rows, [
      { table_name: 'conversation_messages', column_name: 'tenant_id', is_nullable: 'NO' },
      { table_name: 'conversations', column_name: 'tenant_id', is_nullable: 'NO' },
    ]);
  });
});

test('manual Inbox lifecycle is isolated by tenant including direct IDs, mutations and audit', { skip }, async () => {
  await withDatabase(async pool => {
    const store = createTenantInboxStore(pool);
    const conversation = await store.createManualConversation({ tenantId: DEFAULT_TENANT_ID, actorUserId: 'user-a', name: 'Ana', phone: '5511999999999' });
    await store.createManualConversation({ tenantId: TENANT_B, actorUserId: 'user-b', name: 'Ana', phone: '5511999999999' });

    assert.deepEqual((await store.listConversations({ tenantId: DEFAULT_TENANT_ID })).map(row => row.id), [conversation.id]);
    assert.equal(await store.loadConversation({ tenantId: TENANT_B, id: conversation.id }), null);
    assert.equal(await store.updateStatus({ tenantId: TENANT_B, actorUserId: 'user-b', id: conversation.id, status: 'closed' }), false);

    const unchanged = await pool.query('select status from conversations where tenant_id=$1 and id=$2', [DEFAULT_TENANT_ID, conversation.id]);
    assert.equal(unchanged.rows[0].status, 'open');
    assert.equal((await pool.query(`select count(*)::int count from audit_events where tenant_id=$1 and resource_id=$2 and action='conversation.status_changed'`, [TENANT_B, conversation.id])).rows[0].count, 0);

    assert.equal(await store.updateStatus({ tenantId: DEFAULT_TENANT_ID, actorUserId: 'user-a', id: conversation.id, status: 'closed' }), true);
    const audit = await pool.query('select tenant_id,actor_user_id,resource_id from audit_events where action=$1 and resource_id=$2 order by created_at desc limit 1', ['conversation.status_changed', conversation.id]);
    assert.deepEqual(audit.rows[0], { tenant_id: DEFAULT_TENANT_ID, actor_user_id: 'user-a', resource_id: conversation.id });
  });
});
