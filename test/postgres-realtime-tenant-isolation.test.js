const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');

const { provisionTestDatabase } = require('./helpers/postgres-test-database');
const { foundationMigration, operationalExperienceMigration } = require('../domain-schema');
const { appendEvent, replayEvents } = require('../modules/realtime/event-store');
const { heartbeatPresence, expirePresence, listPresence } = require('../modules/inbox/presence-service');

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const TEAM_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEAM_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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

function realtimeEvent({ tenantId, id, teamId, version }) {
  return {
    id,
    tenantId,
    eventType: 'presence.changed',
    aggregateType: 'user',
    aggregateId: `user-${version}`,
    aggregateVersion: version,
    payload: { eventId: id, online: true },
    audience: { teamIds: [teamId], capabilities: ['conversation:read'] },
  };
}

const connectionString = process.env.TEST_DATABASE_URL;
const adminConnectionString = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !connectionString && !adminConnectionString;

test('replay never exposes another tenant or unauthorized team audience', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_realtime_isolation' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await setup(pool);
    await appendEvent(pool, realtimeEvent({ tenantId: TENANT_A, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', teamId: TEAM_A, version: 1 }));
    await appendEvent(pool, realtimeEvent({ tenantId: TENANT_A, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', teamId: TEAM_B, version: 2 }));
    await appendEvent(pool, realtimeEvent({ tenantId: TENANT_B, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', teamId: TEAM_A, version: 1 }));

    const replay = await replayEvents(pool, {
      tenantId: TENANT_A,
      cursor: 0,
      audience: { teamIds: [TEAM_A], capabilities: ['conversation:read'] },
    });
    assert.equal(replay.events.length, 1);
    assert.equal(replay.events[0].tenantId, TENANT_A);
    assert.deepEqual(replay.events[0].audience.teamIds, [TEAM_A]);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('presence heartbeat is tenant/team scoped and expiration emits bounded events', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_presence' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await setup(pool);
    const now = new Date('2026-09-19T12:00:00.000Z');
    await heartbeatPresence(pool, { tenantId: TENANT_A, userId: 'user-a', teamId: TEAM_A, sessionId: 'session-a', ttlMs: 30_000, now });
    await heartbeatPresence(pool, { tenantId: TENANT_A, userId: 'user-b', teamId: TEAM_B, sessionId: 'session-b', ttlMs: 30_000, now });
    await heartbeatPresence(pool, { tenantId: TENANT_B, userId: 'user-c', teamId: TEAM_A, sessionId: 'session-c', ttlMs: 30_000, now });

    const visible = await listPresence(pool, { tenantId: TENANT_A, teamIds: [TEAM_A], now });
    assert.deepEqual(visible.map(item => item.userId), ['user-a']);

    const expired = await expirePresence(pool, { now: new Date(now.getTime() + 31_000) });
    assert.equal(expired.length, 3);
    assert.ok(expired.every(item => item.eventType === 'presence.changed'));
    assert.ok(expired.every(item => item.payload.online === false));

    const after = await listPresence(pool, { tenantId: TENANT_A, teamIds: [TEAM_A], now: new Date(now.getTime() + 31_000) });
    assert.equal(after.length, 0);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});
