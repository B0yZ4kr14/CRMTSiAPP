const test = require('node:test');
const assert = require('node:assert/strict');

const { processWebhookEvent } = require('../webhook-processor');
const { createTenantInboxStore } = require('../tenant-inbox-store');

function transactionalPool(handler) {
  const calls = [];
  const client = {
    async query(sql, values = []) {
      calls.push({ sql: String(sql), values });
      return handler(String(sql), values, calls);
    },
    release() { calls.push({ sql: 'release', values: [] }); },
  };
  return { calls, connect: async () => client, query: client.query };
}

test('inbound message and realtime event are committed in the same transaction', async () => {
  const pool = transactionalPool(async (sql, values) => {
    if (/select id from conversation_messages/.test(sql)) return { rows: [], rowCount: 0 };
    if (/select id from conversations/.test(sql)) return { rows: [{ id: 'conversation-1' }], rowCount: 1 };
    if (/insert into realtime_events/.test(sql)) return { rows: [{ sequence: 1, id: values[0], tenant_id: values[1], event_type: values[2], aggregate_type: values[3], aggregate_id: values[4], aggregate_version: values[5], payload: JSON.parse(values[6]), audience: JSON.parse(values[7]), occurred_at: new Date(), expires_at: values[9] }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
  await processWebhookEvent(pool, {
    kind: 'message', type: 'message', providerEventId: 'provider-1',
    message: { from: '5511999999999', type: 'text', text: { body: 'Olá' }, timestamp: '1758283200' },
  }, { channelId: 'channel-1', tenantId: '11111111-1111-4111-8111-111111111111' });

  const messageIndex = pool.calls.findIndex(call => /insert into conversation_messages/.test(call.sql));
  const eventIndex = pool.calls.findIndex(call => /insert into realtime_events/.test(call.sql));
  const commitIndex = pool.calls.findIndex(call => /^commit$/i.test(call.sql));
  assert.ok(messageIndex >= 0 && eventIndex > messageIndex && commitIndex > eventIndex);
  assert.match(pool.calls[eventIndex].values[2], /inbox\.message\.created/);
});

test('status update and realtime event are committed atomically', async () => {
  const pool = transactionalPool(async (sql, values) => {
    if (/update conversations set status/.test(sql)) return { rows: [{ id: 'conversation-1' }], rowCount: 1 };
    if (/insert into realtime_events/.test(sql)) return { rows: [{ sequence: 1, id: values[0], tenant_id: values[1], event_type: values[2], aggregate_type: values[3], aggregate_id: values[4], aggregate_version: values[5], payload: JSON.parse(values[6]), audience: JSON.parse(values[7]), occurred_at: new Date(), expires_at: values[9] }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
  const store = createTenantInboxStore(pool);
  assert.equal(await store.updateStatus({
    tenantId: '11111111-1111-4111-8111-111111111111', actorUserId: 'user-1', id: 'conversation-1', status: 'closed',
  }), true);
  const updateIndex = pool.calls.findIndex(call => /update conversations set status/.test(call.sql));
  const eventIndex = pool.calls.findIndex(call => /insert into realtime_events/.test(call.sql));
  const commitIndex = pool.calls.findIndex(call => /^commit$/i.test(call.sql));
  assert.ok(updateIndex >= 0 && eventIndex > updateIndex && commitIndex > eventIndex);
  assert.match(pool.calls[eventIndex].values[2], /inbox\.conversation\.updated/);
});

test('assignment update and realtime event are committed atomically', async () => {
  const pool = transactionalPool(async (sql, values) => {
    if (/update conversations set queue_id/.test(sql)) return { rows: [{ id: 'conversation-1' }], rowCount: 1 };
    if (/insert into realtime_events/.test(sql)) return { rows: [{ sequence: 1, id: values[0], tenant_id: values[1], event_type: values[2], aggregate_type: values[3], aggregate_id: values[4], aggregate_version: values[5], payload: JSON.parse(values[6]), audience: JSON.parse(values[7]), occurred_at: new Date(), expires_at: values[9] }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
  const store = createTenantInboxStore(pool);
  assert.equal(await store.assign({
    tenantId: '11111111-1111-4111-8111-111111111111', actorUserId: 'user-1', id: 'conversation-1',
    queueId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', assignedUserId: 'user-2',
  }), true);
  const eventIndex = pool.calls.findIndex(call => /insert into realtime_events/.test(call.sql));
  const commitIndex = pool.calls.findIndex(call => /^commit$/i.test(call.sql));
  assert.ok(eventIndex >= 0 && commitIndex > eventIndex);
  assert.match(pool.calls[eventIndex].values[2], /inbox\.assignment\.changed/);
});
