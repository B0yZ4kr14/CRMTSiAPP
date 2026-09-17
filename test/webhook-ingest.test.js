const test = require('node:test');
const assert = require('node:assert/strict');
const { createWebhookHandler } = require('../webhook-ingest');

function response() {
  return { code: null, body: null, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
}

test('webhook handler verifies, persists, and deduplicates a provider event', async () => {
  const calls = [];
  const pool = { async query(sql, values) {
    calls.push({ sql, values });
    if (sql.includes('insert into webhook_events')) return { rowCount: calls.filter(call => call.sql.includes('insert into webhook_events')).length === 1 ? 1 : 0, rows: [] };
    return { rowCount: 1, rows: [] };
  } };
  const handler = createWebhookHandler({ pool, verify: () => true, eventId: payload => payload.id, normalize: payload => ({ type: 'message', body: payload.body }) });
  const first = response();
  await handler({ headers: {}, body: { id: 'event-1', body: 'Olá' }, rawBody: Buffer.from('{"id":"event-1"}') }, first);
  const second = response();
  await handler({ headers: {}, body: { id: 'event-1', body: 'Olá' }, rawBody: Buffer.from('{"id":"event-1"}') }, second);
  assert.equal(first.code, 202);
  assert.equal(second.code, 200);
  assert.equal(second.body.duplicate, true);
});

test('webhook handler rejects invalid signatures without persisting payload', async () => {
  let persisted = false;
  const pool = { async query() { persisted = true; return { rowCount: 1, rows: [] }; } };
  const handler = createWebhookHandler({ pool, verify: () => false, eventId: payload => payload.id, normalize: payload => payload });
  const result = response();
  await handler({ headers: {}, body: { id: 'bad' }, rawBody: Buffer.from('{}') }, result);
  assert.equal(result.code, 401);
  assert.equal(persisted, false);
});