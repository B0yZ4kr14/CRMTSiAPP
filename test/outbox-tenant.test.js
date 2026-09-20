const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { DEFAULT_TENANT_ID } = require('../domain-schema');
const { encryptCredentials } = require('../channel-secrets');
const { enqueue, markDelivered, markFailed } = require('../outbox');
const { loadJobChannel, processOne } = require('../outbox-worker');

const TENANT_B = '22222222-2222-4222-8222-222222222222';

test('enqueue persists the caller tenant on outbound jobs', async () => {
  let call;
  const pool = { async query(sql, values) { call = { sql, values }; return { rows: [{ id: 'job-tenant-1', tenant_id: TENANT_B }] }; } };

  const result = await enqueue(pool, {
    id: 'job-tenant-1',
    tenantId: TENANT_B,
    channelId: 'channel-tenant-b',
    conversationId: 'conversation-tenant-b',
    kind: 'text',
    payload: { to: '5511999999999', body: 'Olá' },
    idempotencyKey: 'message-tenant-b',
  });

  assert.equal(result.tenant_id, TENANT_B);
  assert.match(call.sql, /insert into outbox_jobs\(id,tenant_id,channel_id,conversation_id,kind,payload,idempotency_key,max_attempts\)/);
  assert.equal(call.values[1], TENANT_B);
});

test('loadJobChannel requires the channel to belong to the job tenant', async () => {
  const key = crypto.randomBytes(32);
  const previous = process.env.CHANNEL_SECRET_KEY;
  process.env.CHANNEL_SECRET_KEY = key.toString('base64');
  try {
    const ciphertext = encryptCredentials({}, key);
    const calls = [];
    const pool = { async query(sql, values) { calls.push({ sql, values }); return { rows: [{ id: 'channel-tenant-b', tenant_id: TENANT_B, provider: 'waha', config: {}, ciphertext }] }; } };

    const channel = await loadJobChannel(pool, { id: 'job-tenant-b', tenant_id: TENANT_B, channel_id: 'channel-tenant-b' });

    assert.equal(channel.tenant_id, TENANT_B);
    assert.match(calls[0].sql, /where c.id=\$1 and c.tenant_id=\$2/);
    assert.deepEqual(calls[0].values, ['channel-tenant-b', TENANT_B]);
  } finally {
    if (previous === undefined) delete process.env.CHANNEL_SECRET_KEY; else process.env.CHANNEL_SECRET_KEY = previous;
  }
});

test('delivery success and terminal failure update linked messages only inside the job tenant', async () => {
  const deliveredCalls = [];
  await markDelivered({ query: async (sql, values) => { deliveredCalls.push({ sql, values }); return { rowCount: 1, rows: [] }; } }, {
    id: 'job-delivered', tenant_id: TENANT_B, idempotency_key: 'message-tenant-b', locked_by: 'worker-1', lease_token: 'lease-1'
  }, { providerMessageId: 'wamid.tenant-b' });

  assert.match(deliveredCalls[0].sql, /where id = \(select idempotency_key from accepted\) and tenant_id = \(select tenant_id from accepted\)/);

  const failedCalls = [];
  const outcome = await markFailed({ query: async (sql, values) => { failedCalls.push({ sql, values }); return { rowCount: 1, rows: [] }; } }, {
    id: 'job-failed', tenant_id: TENANT_B, idempotency_key: 'message-tenant-b', attempts: 7, max_attempts: 8, payload: { to: '5511' }, locked_by: 'worker-1', lease_token: 'lease-1'
  }, { status: 400 });

  assert.deepEqual(outcome, { dead: true });
  assert.match(failedCalls[0].sql, /where id = \(select idempotency_key from failed\) and tenant_id = \(select tenant_id from failed\)/);
  assert.match(failedCalls[0].sql, /insert into failed_jobs\(id,tenant_id,outbox_job_id,reason,payload\)/);
});

test('worker keeps tenant context when dispatching the outbound adapter', async () => {
  const key = crypto.randomBytes(32);
  const previous = process.env.CHANNEL_SECRET_KEY;
  process.env.CHANNEL_SECRET_KEY = key.toString('base64');
  try {
    const ciphertext = encryptCredentials({ apiKey: 'secret' }, key);
    let sent;
    const pool = { async query(sql, values) {
      if (sql.includes('from outbox_jobs')) return { rows: [{ id: 'job-tenant-b', tenant_id: TENANT_B, channel_id: 'channel-tenant-b', kind: 'text', payload: { to: '5511999999999', body: 'Olá' }, attempts: 0, max_attempts: 8, locked_by: 'worker-1', lease_token: 'lease-1' }] };
      if (sql.includes('from channels c')) return { rows: [{ id: 'channel-tenant-b', tenant_id: TENANT_B, provider: 'waha', config: {}, ciphertext }] };
      return { rowCount: 1, rows: [] };
    } };

    const result = await processOne({
      pool,
      workerId: 'worker-1',
      adapters: { waha: { sendText: async (payload) => { sent = payload; return { providerMessageId: 'provider-tenant-b' }; } } },
    });

    assert.deepEqual(result, { id: 'job-tenant-b', status: 'sent' });
    assert.equal(sent.channel.tenant_id, TENANT_B);
  } finally {
    if (previous === undefined) delete process.env.CHANNEL_SECRET_KEY; else process.env.CHANNEL_SECRET_KEY = previous;
  }
});

test('tenant migration upgrades outbox, delivery events and failed jobs to tenant scoped tables', () => {
  const { tenantMigration } = require('../domain-schema');
  const sql = tenantMigration();
  for (const table of ['outbox_jobs', 'delivery_events', 'failed_jobs']) {
    assert.match(sql, new RegExp(`alter table ${table} add column if not exists tenant_id uuid`));
    assert.match(sql, new RegExp(`alter table ${table} alter column tenant_id set not null`));
    assert.match(sql, new RegExp(`create index if not exists ${table}_tenant_idx on ${table}\\(tenant_id\\)`));
  }
  assert.match(sql, /update outbox_jobs job set tenant_id=coalesce/);
  assert.match(sql, /update delivery_events event set tenant_id=coalesce/);
  assert.match(sql, /update failed_jobs failed set tenant_id=coalesce/);
  assert.equal(DEFAULT_TENANT_ID, '00000000-0000-4000-8000-000000000001');
});
