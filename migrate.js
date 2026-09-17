const { Pool } = require('pg');

const { foundationMigration } = require('./domain-schema');
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL ausente');
const pool = new Pool({ connectionString: DATABASE_URL });

const APP_URL = process.env.APP_URL || 'https://crm.tsiapp.io';
const BRAND = process.env.BRAND_NAME || 'CRMTSiAPP';
const COMPANY = process.env.COMPANY_NAME || 'TSi Telecom';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@tsiapp.io';
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';

async function main() {
  const client = await pool.connect();
  try {
    await client.query('begin');

    await client.query(`create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())`);
    await client.query(`create table if not exists settings (key text primary key, value text not null, updated_at timestamptz not null default now())`);

    await client.query(`create table if not exists users (
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
    await client.query(`create index if not exists users_email_idx on users(email)`);
    await client.query(`create index if not exists users_login_idx on users(login)`);

    await client.query(`create table if not exists sessions (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      token_hash text unique not null,
      user_agent text,
      ip text,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )`);
    await client.query(`create index if not exists sessions_expires_idx on sessions(expires_at)`);

    await client.query(`create table if not exists companies (
      id bigserial primary key,
      name text not null,
      tax_id text,
      phone text,
      email text,
      website text,
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
    await client.query(`alter table companies add column if not exists canonical_name text generated always as (lower(btrim(name))) stored`);
    await client.query(`create unique index if not exists companies_canonical_name_key on companies(canonical_name)`);

    await client.query(`create table if not exists contacts (
      id bigserial primary key,
      name text not null,
      email text,
      phone text,
      company_id bigint references companies(id) on delete set null,
      company text,
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
    await client.query(`create table if not exists leads (
      id bigserial primary key,
      title text not null,
      contact_id bigint references contacts(id) on delete set null,
      status text not null default 'novo',
      value_cents integer not null default 0,
      source text,
      next_action text,
      owner_id text references users(id) on delete set null,
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);

    await client.query(`create table if not exists conversations (
      id text primary key,
      contact_name text not null,
      contact_phone text,
      status text not null default 'open',
      channel text not null default 'local',
      last_message_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      check (status in ('open','closed')),
      check (char_length(contact_name) between 1 and 200)
    )`);
    await client.query(`create index if not exists conversations_last_message_idx on conversations(last_message_at desc nulls last)`);

    await client.query(`create table if not exists conversation_messages (
      id text primary key,
      conversation_id text not null references conversations(id) on delete cascade,
      direction text not null,
      body text not null,
      provider_message_id text,
      delivery_status text,
      created_at timestamptz not null default now(),
      check (direction in ('inbound','outbound')),
      check (char_length(body) between 1 and 4000)
    )`);
    await client.query(`create index if not exists conversation_messages_conversation_idx on conversation_messages(conversation_id, created_at)`);
    await client.query(`create index if not exists conversation_messages_provider_message_idx on conversation_messages(provider_message_id) where provider_message_id is not null`);

    await client.query(`create table if not exists activities (
      id bigserial primary key,
      lead_id bigint references leads(id) on delete cascade,
      contact_id bigint references contacts(id) on delete set null,
      kind text not null default 'nota',
      summary text not null,
      due_at timestamptz,
      done_at timestamptz,
      created_by text references users(id) on delete set null,
      created_at timestamptz not null default now()
    )`);

    const constraints = [
      ['contacts', 'contacts_name_length', 'check (char_length(name) between 1 and 200)'],
      ['leads', 'leads_title_length', 'check (char_length(title) between 1 and 200)'],
      ['leads', 'leads_status_valid', "check (status in ('novo','qualificado','proposta','ganho','perdido'))"],
      ['leads', 'leads_value_nonnegative', 'check (value_cents >= 0)'],
      ['sessions', 'sessions_expiry_after_creation', 'check (expires_at > created_at)'],
    ];
    for (const [table, name, definition] of constraints) {
      const exists = await client.query('select 1 from pg_constraint where conrelid=$1::regclass and conname=$2', [table, name]);
      if (!exists.rowCount) await client.query(`alter table ${table} add constraint ${name} ${definition} not valid`);
    }

    const settings = { brand_name: BRAND, company_name: COMPANY, app_url: APP_URL, admin_email: ADMIN_EMAIL, login_alias: ADMIN_LOGIN };
    for (const [key, value] of Object.entries(settings)) {
      await client.query(`insert into settings(key,value) values($1,$2) on conflict(key) do update set value=excluded.value, updated_at=now()`, [key, value]);
    }

    await client.query(`insert into schema_migrations(version) values('001_initial_local_postgres') on conflict do nothing`);
    await client.query(`insert into schema_migrations(version) values('002_integrity_hardening') on conflict do nothing`);
    await client.query(foundationMigration());
    await client.query(`insert into schema_migrations(version) values('004_operational_domain_foundation') on conflict do nothing`);
    await client.query(`insert into schema_migrations(version) values('005_channel_delivery_events') on conflict do nothing`);
    await client.query(`insert into schema_migrations(version) values('006_durable_webhooks') on conflict do nothing`);
    await client.query(`insert into schema_migrations(version) values('007_fenced_outbox') on conflict do nothing`);

    await client.query(`insert into companies (name, tax_id, notes) values ($1,$2,$3)
      on conflict (canonical_name) do update set tax_id=excluded.tax_id, notes=excluded.notes, updated_at=now()`, [COMPANY, 'TSi Telecom', 'Empresa/tenant principal do CRMTSiAPP']);

    await client.query('commit');
    console.log('MIGRATION_OK');
  } catch (err) {
    await client.query('rollback');
    console.error(err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
