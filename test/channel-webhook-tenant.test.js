const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createChannelWebhookService } = require('../channel-webhook-service');

function response() {
  return {
    code: null,
    body: null,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
  };
}

test('durable webhook ingestion persists the owning channel tenant', async () => {
  const writes = [];
  const secret = 'secret-1';
  const payload = { entry: [{ changes: [{ value: { messages: [{ id: 'wamid.tenant', from: '5511999999999', type: 'text' }] } }] }] };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const service = createChannelWebhookService({
    loadChannel: async () => ({
      provider: 'meta',
      tenant_id: '11111111-1111-4111-8111-111111111111',
      config: {},
      credentials: { appSecret: secret },
    }),
    pool: { async query(sql, values) { writes.push({ sql, values }); return { rowCount: 1, rows: [{ id: 'event-1' }] }; } },
  });

  const result = response();
  await service.receive({ headers: { 'x-hub-signature-256': signature }, rawBody, body: payload }, result, 'channel-1');

  assert.equal(result.code, 202);
  assert.match(writes[0].sql, /tenant_id/);
  assert.equal(writes[0].values[2], '11111111-1111-4111-8111-111111111111');
});
