const test = require('node:test');
const assert = require('node:assert/strict');
const { enqueue } = require('../outbox');

test('enqueue creates an idempotent pending outbox job for a channel message', async () => {
  let call;
  const pool = { async query(sql, values) { call = { sql, values }; return { rows: [{ id: 'job-1' }] }; } };
  const result = await enqueue(pool, {
    id: 'job-1', channelId: 'channel-1', conversationId: 'conversation-1', kind: 'text',
    payload: { to: '5511999999999', body: 'Olá' }, idempotencyKey: 'message-1',
  });
  assert.equal(result.id, 'job-1');
  assert.match(call.sql, /on conflict\(idempotency_key\) do update/);
  assert.deepEqual(call.values.slice(0, 5), ['job-1', 'channel-1', 'conversation-1', 'text', JSON.stringify({ to: '5511999999999', body: 'Olá' })]);
});

test('enqueue rejects unsupported job kinds before writing to PostgreSQL', async () => {
  let called = false;
  await assert.rejects(() => enqueue({ query: async () => { called = true; } }, { kind: 'unknown' }), /unsupported outbox kind/);
  assert.equal(called, false);
});