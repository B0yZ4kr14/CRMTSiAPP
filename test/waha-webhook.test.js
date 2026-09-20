const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createChannelWebhookService } = require('../channel-webhook-service');

function response() {
  return { code: null, body: null, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, send(value) { this.body = value; return this; } };
}

function signedWahaBody(body, secret) {
  return crypto.createHmac('sha512', secret).update(body).digest('hex');
}

test('WAHA webhook verifies SHA-512 raw-body HMAC and normalizes only inbound messages', async () => {
  const rawBody = Buffer.from(JSON.stringify({ event: 'message', session: 'support', payload: { id: 'false_5511999999999@c.us_in-1', from: '5511999999999@c.us', body: 'Olá', timestamp: 1700000000, fromMe: false } }));
  const calls = [];
  const service = createChannelWebhookService({
    pool: { query: async (sql, values) => { calls.push({ sql, values }); return sql.includes('insert into webhook_events') ? { rowCount: 1, rows: [{ id: 'event-1' }] } : { rowCount: 1, rows: [] }; } },
    loadChannel: async () => ({ provider: 'waha', tenant_id: '11111111-1111-4111-8111-111111111111', config: { sessionName: 'support' }, credentials: { apiKey: 'waha-secret' } }),
  });
  const res = response();
  await service.receive({ headers: { 'x-webhook-hmac-algorithm': 'sha512', 'x-webhook-hmac': signedWahaBody(rawBody, 'waha-secret') }, rawBody, body: JSON.parse(rawBody) }, res, 'channel-1');

  assert.equal(res.code, 202);
  const insert = calls.find(c => c.sql.includes('insert into webhook_events'));
  assert.ok(insert);
  assert.equal(insert.values[1], 'channel-1');
  assert.equal(insert.values[2], '11111111-1111-4111-8111-111111111111');
  assert.equal(insert.values[3], 'false_5511999999999@c.us_in-1');
});

test('WAHA webhook rejects an invalid HMAC before persistence and ignores outbound echoes', async () => {
  let writes = 0;
  const service = createChannelWebhookService({
    pool: { query: async () => { writes += 1; return { rowCount: 1, rows: [] }; } },
    loadChannel: async () => ({ provider: 'waha', config: { sessionName: 'support' }, credentials: { apiKey: 'waha-secret' } }),
  });
  const invalid = response();
  await service.receive({ headers: { 'x-webhook-hmac-algorithm': 'sha512', 'x-webhook-hmac': 'bad' }, rawBody: Buffer.from('{}'), body: {} }, invalid, 'channel-1');
  assert.equal(invalid.code, 401);
  assert.equal(writes, 0);

  const rawBody = Buffer.from(JSON.stringify({ event: 'message', session: 'support', payload: { id: 'true_5511999999999@c.us_out-1', from: '5511999999999@c.us', body: 'Resposta', timestamp: 1700000000, fromMe: true } }));
  const echo = response();
  await service.receive({ headers: { 'x-webhook-hmac-algorithm': 'sha512', 'x-webhook-hmac': signedWahaBody(rawBody, 'waha-secret') }, rawBody, body: JSON.parse(rawBody) }, echo, 'channel-1');
  assert.equal(echo.code, 200);
  assert.equal(echo.body.ignored, true);
});
