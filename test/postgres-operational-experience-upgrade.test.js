const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');

const { foundationMigration, operationalExperienceMigration, SCHEMA_VERSION } = require('../domain-schema');

const connectionString = process.env.TEST_DATABASE_URL;
const adminConnectionString = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !connectionString && !adminConnectionString;

test('operational experience migration is repeatable on an upgraded database', { skip }, async () => {
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
    await pool.query(operationalExperienceMigration());
    assert.equal(SCHEMA_VERSION, '005-operational-experience');
    const tables = await pool.query(`select tablename from pg_tables where schemaname='public' and tablename in ('operational_idempotency_keys','operational_schema_versions') order by tablename`);
    assert.deepEqual(tables.rows.map(row => row.tablename), ['operational_idempotency_keys', 'operational_schema_versions']);
    const version = await pool.query('select version from operational_schema_versions where version=$1', [SCHEMA_VERSION]);
    assert.equal(version.rowCount, 1);
  } finally {
    await pool.end();
    if (admin && database) {
      await admin.query(`drop database if exists \"${database}\" with (force)`);
      await admin.end();
    }
  }
});
