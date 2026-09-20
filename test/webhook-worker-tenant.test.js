const test = require('node:test');
const assert = require('node:assert/strict');
const { processOneWebhook } = require('../webhook-worker');

test('webhook worker carries the channel tenant into asynchronous inbound processing', async () => {
  const calls = [];
  const event = {
    id: 'event-1',
    channel_id: 'channel-1',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    payload: { type: 'message', providerEventId: 'provider-1', message: { from: '5511999999999' } },
    locked_by: 'worker-1',
    lease_token: 'lease-1',
  };
  const pool = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (/with next_event/i.test(sql)) return { rows: [event] };
      if (/set status='processed'/i.test(sql)) return { rowCount: 1 };
      throw new Error(`unexpected query: ${sql}`);
    },
  };

  const processed = [];
  const result = await processOneWebhook({
    pool,
    workerId: 'worker-1',
    processEvent: async (_pool, payload, context) => processed.push({ payload, context }),
  });
  assert.deepEqual(result, { id: 'event-1', status: 'processed' });
  assert.deepEqual(processed, [{
    payload: event.payload,
    context: { channelId: 'channel-1', tenantId: event.tenant_id },
  }]);

  const processedUpdate = calls.find(({ sql }) => /set status='processed'/i.test(sql));
  assert.ok(processedUpdate);
});
