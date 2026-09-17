const test = require('node:test');
const assert = require('node:assert/strict');
const { markDelivered, markFailed } = require('../outbox');

test('provider acceptance atomically links the CRM message and advances its delivery state', async () => {
  const calls = [];
  const pool = { query: async (sql, values) => { calls.push({ sql, values }); return { rows: [] }; } };

  await markDelivered(pool, { id: 'job-1', idempotency_key: 'message-1' }, { providerMessageId: 'wamid.outbound-1' });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /update outbox_jobs/);
  assert.match(calls[0].sql, /update conversation_messages/);
  assert.match(calls[0].sql, /provider_message_id/);
  assert.match(calls[0].sql, /where id = \(select idempotency_key from accepted\)/);
});

test('a terminal delivery failure advances the linked CRM message to failed', async () => {
  const calls = [];
  const pool = { query: async (sql, values) => { calls.push({ sql, values }); return { rows: [] }; } };

  const outcome = await markFailed(pool, { id: 'job-2', idempotency_key: 'message-2', attempts: 7, max_attempts: 8, payload: { to: '5511' } }, { status: 400, message: 'invalid recipient' });

  assert.deepEqual(outcome, { dead: true });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /dead_letter/);
  assert.match(calls[0].sql, /update conversation_messages/);
  assert.match(calls[0].sql, /where id = \(select idempotency_key from failed\)/);
  assert.match(calls[0].sql, /insert into failed_jobs/);
});
