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

test('a replay reclaims an authentic webhook event that failed after durable ingestion', async () => {
  const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');
  const signature = `sha256=${crypto.createHmac('sha256', 'secret-1').update(rawBody).digest('hex')}`;
  let callCount = 0;
  const pool = { async query(sql, values) { callCount += 1; return { rowCount: callCount === 1 ? 1 : 0, rows: [] }; } };
  const service = createChannelWebhookService({
    pool,
    loadChannel: async () => ({ provider: 'meta', credentials: { appSecret: 'secret-1' } }),
  });
  const first = response();
  await service.receive({ headers: { 'x-hub-signature-256': signature }, rawBody, body: { entry: [{ changes: [{ value: { messages: [{ id: 'wamid.1', from: '5511999999999', text: { body: 'Olá' } }] } }] }] } }, first, 'channel-1');
  assert.equal(callCount, 1);
  assert.equal(first.code, 202);
  assert.equal(first.body.duplicate, false);

  const replay = response();
  await service.receive({ headers: { 'x-hub-signature-256': signature }, rawBody, body: { entry: [{ changes: [{ value: { messages: [{ id: 'wamid.1', from: '5511999999999', text: { body: 'Olá' } }] } }] }] } }, replay, 'channel-1');
  assert.equal(callCount, 2);
  assert.equal(replay.code, 200);
  assert.ok(replay.body.duplicate);
});

test('Meta webhook verification accepts only a matching SHA-256 signature', async () => {
  const service = createChannelWebhookService({
    loadChannel: async () => ({ provider: 'meta', config: {}, credentials: { verifyToken: 'verify-1', appSecret: 'secret-1' } }),
    pool: { query: async () => ({ rowCount: 1, rows: [] }) },
  });
  const accepted = response();
  await service.verify({ query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-1', 'hub.challenge': 'challenge-1' } }, accepted, 'channel-1');
  assert.equal(accepted.code, 200);
  assert.equal(accepted.body, 'challenge-1');

  const denied = response();
  await service.verify({ query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'challenge-1' } }, denied, 'channel-1');
  assert.equal(denied.code, 403);
});

test('Meta POST rejects an invalid signature before any event is persisted', async () => {
  let persisted = false;
  const service = createChannelWebhookService({
    loadChannel: async () => ({ provider: 'meta', config: {}, credentials: { appSecret: 'secret-1' } }),
    pool: { async query() { persisted = true; return { rowCount: 1, rows: [] }; } },
  });
  const result = response();
  await service.receive({ headers: { 'x-hub-signature-256': 'sha256=invalid' }, body: { entry: [{ changes: [{ value: { messages: [{ id: 'wamid.1' }] } }] }] }, rawBody: Buffer.from('{}') }, result, 'channel-1');
  assert.equal(result.code, 401);
  assert.equal(persisted, false);
});

test('Meta POST persists only an authentic normalized event and returns duplicate safely', async () => {
  let inserts = 0;
  const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');
  const signature = `sha256=${crypto.createHmac('sha256', 'secret-1').update(rawBody).digest('hex')}`;
  const pool = { async query(sql) { if (sql.includes('insert into webhook_events')) return { rowCount: ++inserts === 1 ? 1 : 0, rows: [] }; return { rowCount: 1, rows: [] }; } };
  const service = createChannelWebhookService({
    loadChannel: async () => ({ provider: 'meta', config: {}, credentials: { appSecret: 'secret-1' } }),
    pool,
  });
  const payload = { entry: [{ changes: [{ value: { messages: [{ id: 'wamid.1', text: { body: 'Olá' } }] } }] }] };
  const first = response();
  await service.receive({ headers: { 'x-hub-signature-256': signature }, body: payload, rawBody }, first, 'channel-1');
  const second = response();
  await service.receive({ headers: { 'x-hub-signature-256': signature }, body: payload, rawBody }, second, 'channel-1');
  assert.equal(first.code, 202);
  assert.equal(second.code, 200);
  assert.equal(second.body.duplicate, true);
});