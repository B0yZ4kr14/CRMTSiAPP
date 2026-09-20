const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { DEFAULT_TENANT_ID } = require('../domain-schema');
const { processWebhookEvent } = require('../webhook-processor');

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DATABASE_ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL;

async function provisionDatabase() {
  if (!TEST_DATABASE_ADMIN_URL) return { connectionString: TEST_DATABASE_URL, cleanup: async () => {} };
  const admin = new Pool({ connectionString: TEST_DATABASE_ADMIN_URL });
  const database = `crmtsiapp_test_${process.pid}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  await admin.query(`create database ${database}`);
  const base = new URL(TEST_DATABASE_ADMIN_URL);
  base.pathname = `/${database}`;
  return {
    connectionString: base.toString(),
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
    await pool.query(`create table channels(id uuid primary key, tenant_id uuid)`);
    await pool.query(`create table conversations(
      id text primary key,
      tenant_id uuid,
      contact_name text not null,
      contact_phone text not null,
      status text not null,
      channel text not null,
      last_message_at timestamptz,
      last_inbound_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
    await pool.query(`create table conversation_messages(
      id text primary key,
      tenant_id uuid,
      conversation_id text not null references conversations(id),
      direction text not null,
      body text not null,
      provider_channel_id uuid references channels(id),
      provider_message_id text,
      created_at timestamptz not null default now()
    )`);
    await pool.query(`create unique index conversation_messages_provider_channel_message_key
      on conversation_messages(provider_channel_id, provider_message_id)
      where provider_channel_id is not null and provider_message_id is not null`);
    await pool.query(`create table realtime_events(
      sequence bigint generated always as identity primary key,
      id uuid not null unique,
      tenant_id uuid not null,
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
    await fn(pool);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
}

const skip = !TEST_DATABASE_URL && !TEST_DATABASE_ADMIN_URL;

test('real PostgreSQL serializes concurrent retries and creates one inbound effect', { skip }, async () => {
  await withDatabase(async pool => {
    const channelId = '11111111-1111-4111-8111-111111111111';
    await pool.query('insert into channels(id,tenant_id) values($1,$2)', [channelId, DEFAULT_TENANT_ID]);
    const event = {
      type: 'message',
      providerEventId: 'provider-message-1',
      message: { from: '5511999999999', type: 'text', text: { body: 'olá' }, timestamp: '1700000000' },
      contacts: [{ wa_id: '5511999999999', profile: { name: 'Ana' } }],
    };

    await Promise.all(Array.from({ length: 12 }, () => processWebhookEvent(pool, event, { channelId, tenantId: DEFAULT_TENANT_ID })));

    const conversations = await pool.query('select count(*)::int as count from conversations');
    const messages = await pool.query('select count(*)::int as count from conversation_messages');
    assert.equal(conversations.rows[0].count, 1);
    assert.equal(messages.rows[0].count, 1);
  });
});

test('real PostgreSQL permits provider message IDs to repeat across channels', { skip }, async () => {
  await withDatabase(async pool => {
    const channelIds = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ];
    for (const channelId of channelIds) await pool.query('insert into channels(id,tenant_id) values($1,$2)', [channelId, DEFAULT_TENANT_ID]);
    const event = {
      type: 'message',
      providerEventId: 'shared-provider-id',
      message: { from: '5511888888888', type: 'text', text: { body: 'olá' }, timestamp: '1700000000' },
    };

    await Promise.all(channelIds.map(channelId => processWebhookEvent(pool, event, { channelId, tenantId: DEFAULT_TENANT_ID })));

    const messages = await pool.query('select count(*)::int as count from conversation_messages');
    assert.equal(messages.rows[0].count, 2);
  });
});
