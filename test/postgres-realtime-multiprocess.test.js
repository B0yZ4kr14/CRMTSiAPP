const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');

const { provisionTestDatabase } = require('./helpers/postgres-test-database');
const { foundationMigration, operationalExperienceMigration } = require('../domain-schema');
const { appendEvent, replayEvents } = require('../modules/realtime/event-store');
const { createPostgresListener } = require('../modules/realtime/postgres-listener');

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail('timed out waiting for PostgreSQL notification');
}

async function setup(pool) {
  await pool.query(`create table users(
    id text primary key,
    login text unique,
    email text unique,
    name text,
    role text not null default 'agent',
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
  await pool.query(foundationMigration());
  await pool.query('insert into tenants(id,name,slug) values($1,$2,$3),($4,$5,$6) on conflict do nothing', [TENANT_A, 'Tenant A', 'tenant-a', TENANT_B, 'Tenant B', 'tenant-b']);
  await pool.query(operationalExperienceMigration());
}

const connectionString = process.env.TEST_DATABASE_URL;
const adminConnectionString = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !connectionString && !adminConnectionString;

test('multiple instances use NOTIFY only as wake-up and re-read the durable tenant stream', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_realtime_multiprocess' });
  const writer = new Pool({ connectionString: provisioned.connectionString });
  const reader = new Pool({ connectionString: provisioned.connectionString });
  const observed = [];
  const listener = createPostgresListener({
    connectionString: provisioned.connectionString,
    onWake: async ({ tenantId, sequence }) => {
      const replay = await replayEvents(reader, { tenantId, cursor: 0 });
      observed.push({ tenantId, sequence, events: replay.events });
    },
  });

  try {
    await setup(writer);
    await listener.start();
    const stored = await appendEvent(writer, {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      tenantId: TENANT_A,
      eventType: 'inbox.message.created',
      aggregateType: 'conversation',
      aggregateId: 'conversation-a',
      aggregateVersion: 1,
      payload: { eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', body: 'durable payload' },
      audience: {},
    });
    await listener.notify(writer, { tenantId: TENANT_A, sequence: stored.sequence });
    await waitFor(() => observed.length === 1);

    assert.equal(observed[0].tenantId, TENANT_A);
    assert.equal(observed[0].sequence, stored.sequence);
    assert.equal(observed[0].events.length, 1);
    assert.equal(observed[0].events[0].payload.body, 'durable payload');
    assert.doesNotMatch(listener.lastNotificationPayload(), /durable payload|conversation-a/);
  } finally {
    await listener.stop();
    await reader.end();
    await writer.end();
    await provisioned.cleanup();
  }
});

test('listener ignores malformed wake-ups and keeps tenant streams isolated', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_realtime_notify_isolation' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  const wakes = [];
  const listener = createPostgresListener({ connectionString: provisioned.connectionString, onWake: wake => wakes.push(wake) });
  try {
    await setup(pool);
    await listener.start();
    await pool.query(`select pg_notify('crmtsiapp_realtime','not-json')`);
    await appendEvent(pool, {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', tenantId: TENANT_B,
      eventType: 'inbox.message.created', aggregateType: 'conversation', aggregateId: 'conversation-b', aggregateVersion: 1,
      payload: { eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' }, audience: {},
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.deepEqual(wakes, []);
  } finally {
    await listener.stop();
    await pool.end();
    await provisioned.cleanup();
  }
});
