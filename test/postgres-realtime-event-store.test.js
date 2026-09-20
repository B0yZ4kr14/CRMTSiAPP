const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');

const { provisionTestDatabase } = require('./helpers/postgres-test-database');
const { foundationMigration, operationalExperienceMigration } = require('../domain-schema');
const { appendEvent, replayEvents, pruneExpiredEvents } = require('../modules/realtime/event-store');

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

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

function event(tenantId, id, version, options = {}) {
  return {
    id,
    tenantId,
    eventType: 'inbox.conversation.updated',
    aggregateType: 'conversation',
    aggregateId: 'conversation-1',
    aggregateVersion: version,
    payload: { eventId: id, status: options.status || 'open' },
    audience: { capabilities: ['conversation:read'] },
    expiresAt: options.expiresAt,
  };
}

const connectionString = process.env.TEST_DATABASE_URL;
const adminConnectionString = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !connectionString && !adminConnectionString;

test('realtime event store appends and replays tenant events in sequence order', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_realtime' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await setup(pool);
    const first = await appendEvent(pool, event(TENANT_A, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 1));
    await appendEvent(pool, event(TENANT_B, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 1));
    const second = await appendEvent(pool, event(TENANT_A, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 2, { status: 'closed' }));

    const replay = await replayEvents(pool, { tenantId: TENANT_A, cursor: 0, limit: 100 });
    assert.equal(replay.cursorExpired, false);
    assert.deepEqual(replay.events.map(item => item.sequence), [first.sequence, second.sequence]);
    assert.deepEqual(replay.events.map(item => item.payload.status), ['open', 'closed']);
    assert.ok(replay.events.every(item => item.tenantId === TENANT_A));

    const afterFirst = await replayEvents(pool, { tenantId: TENANT_A, cursor: first.sequence, limit: 100 });
    assert.deepEqual(afterFirst.events.map(item => item.sequence), [second.sequence]);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('realtime event store enforces aggregate version uniqueness and event identity', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_realtime_constraints' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await setup(pool);
    const original = event(TENANT_A, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 1);
    await appendEvent(pool, original);
    await assert.rejects(appendEvent(pool, { ...original, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4' }), /duplicate key/i);
    await assert.rejects(appendEvent(pool, { ...original, aggregateVersion: 2 }), /duplicate key/i);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('replay expands beyond 6,000 events without crossing tenant boundaries', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_realtime_large_replay' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await setup(pool);
    for (let index = 1; index <= 6005; index += 1) {
      await appendEvent(pool, event(TENANT_A, `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, '0')}`, index));
    }
    await appendEvent(pool, event(TENANT_B, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1));
    const replay = await replayEvents(pool, { tenantId: TENANT_A, cursor: 0, limit: 6005, expand: true });
    assert.equal(replay.cursorExpired, false);
    assert.equal(replay.events.length, 6005);
    assert.deepEqual(replay.events.slice(0, 2).map(item => item.aggregate.version), [1, 2]);
    assert.equal(replay.events.at(-1).aggregate.version, 6005);
    assert.ok(replay.events.every(item => item.tenantId === TENANT_A));
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('expired realtime history forces reconciliation and retention can prune it', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_realtime_retention' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await setup(pool);
    const expired = await appendEvent(pool, event(TENANT_A, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 1, {
      expiresAt: new Date(Date.now() - 60_000),
    }));
    await appendEvent(pool, event(TENANT_A, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 2, {
      expiresAt: new Date(Date.now() + 60_000),
    }));

    const replay = await replayEvents(pool, { tenantId: TENANT_A, cursor: 0, limit: 100 });
    assert.equal(replay.cursorExpired, true);
    assert.equal(replay.events.length, 0);
    assert.ok(replay.currentCursor > expired.sequence);

    const deleted = await pruneExpiredEvents(pool, { tenantId: TENANT_A, before: new Date() });
    assert.equal(deleted, 1);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});
