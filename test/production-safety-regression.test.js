const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const { createChannelWebhookService } = require('../channel-webhook-service');
const { effectiveRole } = require('../authorization');
const { WahaAdapter, MetaAdapter } = require('../channel-adapter');
const { claimNextJob, markDelivered, markFailed } = require('../outbox');

function response() {
  return { code: null, body: null, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
}

test('webhook ingress only persists durable pending events and never processes them inline', async () => {
  const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');
  const signature = `sha256=${crypto.createHmac('sha256', 'secret-1').update(rawBody).digest('hex')}`;
  let inlineCalls = 0;
  const calls = [];
  const service = createChannelWebhookService({
    loadChannel: async () => ({ provider: 'meta', credentials: { appSecret: 'secret-1' } }),
    pool: { async query(sql, values) { calls.push({ sql, values }); return { rowCount: 1, rows: [{ id: 'event-1' }] }; } },
    onAccepted: async () => { inlineCalls += 1; },
  });
  const result = response();
  await service.receive({ headers: { 'x-hub-signature-256': signature }, rawBody, body: { entry: [{ changes: [{ value: { messages: [{ id: 'wamid.1', from: '5511999999999', text: { body: 'Olá' } }] } }] }] } }, result, 'channel-1');

  assert.equal(result.code, 202);
  assert.equal(inlineCalls, 0);
  assert.match(calls[0].sql, /status/i);
  assert.match(calls[0].sql, /pending/i);
});

test('schema gives webhook processing and outbox delivery fenced leases', () => {
  const ddl = source('domain-schema.js');
  assert.match(ddl, /webhook_events[\s\S]*status[\s\S]*attempts[\s\S]*available_at[\s\S]*locked_by[\s\S]*lease_token/);
  assert.match(ddl, /outbox_jobs[\s\S]*lease_token/);
});

test('outbox completion is conditional on the current fenced lease', async () => {
  const calls = [];
  const pool = { async query(sql, values) { calls.push({ sql, values }); return { rowCount: 1, rows: [] }; } };
  const job = { id: 'job-1', attempts: 0, max_attempts: 8, locked_by: 'worker-1', lease_token: 'lease-1' };
  await markDelivered(pool, job, { providerMessageId: 'provider-1' });
  await markFailed(pool, job, new Error('temporary'));
  for (const call of calls) {
    assert.match(call.sql, /locked_by/);
    assert.match(call.sql, /lease_token/);
    assert.ok(call.values.includes('worker-1'));
    assert.ok(call.values.includes('lease-1'));
  }
});

test('provider calls are time bounded and reject success responses without a provider id', async () => {
  for (const Adapter of [WahaAdapter, MetaAdapter]) {
    let options;
    const adapter = new Adapter({ fetchFn: async (_url, requestOptions) => {
      options = requestOptions;
      return new Response(JSON.stringify(Adapter === WahaAdapter ? {} : { messages: [{}] }), { status: 200 });
    } });
    const channel = Adapter === WahaAdapter
      ? { config: { baseUrl: 'https://waha.example', sessionName: 'support', apiKey: 'key' } }
      : { config: { graphVersion: 'v23.0', phoneNumberId: '123', accessToken: 'token' } };
    if (Adapter === WahaAdapter) adapter.dispatcherFactory = async () => ({ close: async () => {} });
    await assert.rejects(() => adapter.sendText({ channel, to: '5511999999999', body: 'Olá' }), /message id|provider/i);
    assert.ok(options.signal instanceof AbortSignal);
  }
});

test('schema migration does not bootstrap, reactivate, promote, or reset an administrator', () => {
  const migration = source('migrate.js');
  assert.doesNotMatch(migration, /adminPassword\s*\(/);
  assert.doesNotMatch(migration, /on conflict \(email\) do update set.*password_hash/);
});

test('assigned roles must resolve deterministically or fail closed', () => {
  assert.equal(effectiveRole({ legacyRole: 'viewer', assignedRoles: ['viewer', 'admin'] }), null);
  assert.equal(effectiveRole({ legacyRole: 'admin', assignedRoles: ['admin', 'admin'] }), 'admin');
});

test('assigned roles resolve deterministically and invalid role returns null', () => {
  assert.equal(effectiveRole({ legacyRole: 'viewer', assignedRoles: ['viewer', 'admin'] }), null);
  assert.equal(effectiveRole({ legacyRole: 'admin', assignedRoles: ['admin', 'admin'] }), 'admin');
  assert.equal(effectiveRole({ legacyRole: 'manager', assignedRoles: [] }), 'manager');
  assert.equal(effectiveRole({ legacyRole: 'unknown', assignedRoles: [] }), null);
  assert.equal(effectiveRole({ legacyRole: 'viewer', assignedRoles: ['invalid'] }), null);
  for (let i = 0; i < 10; i++) {
    assert.equal(effectiveRole({ legacyRole: 'agent', assignedRoles: ['agent', 'manager'] }), null);
  }
});

test('authenticated read routes declare explicit capabilities without a truthy bypass', () => {
  const capabilities = require('../route-capabilities').ROUTE_CAPABILITIES;
  assert.equal(capabilities['GET /inbox'], 'conversation:read');
  assert.equal(capabilities['GET /inbox/:id'], 'conversation:read');
  assert.equal(capabilities['GET /connections'], 'channel:read');
});

test('webhook and outbox workers retain the explicitly accepted root runtime while preserving systemd hardening', () => {
  const outboxUnit = source('crmtsiapp-outbox-worker.service');
  assert.match(outboxUnit, /^User=root$/m);
  assert.match(outboxUnit, /^NoNewPrivileges=true$/m);
  assert.match(outboxUnit, /^CapabilityBoundingSet=$/m);
  const webhookUnit = source('crmtsiapp-webhook-worker.service');
  assert.match(webhookUnit, /^User=root$/m);
  assert.match(webhookUnit, /^NoNewPrivileges=true$/m);
  assert.match(webhookUnit, /^CapabilityBoundingSet=$/m);
});
