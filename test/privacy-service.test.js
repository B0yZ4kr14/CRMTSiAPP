const test = require('node:test');
const assert = require('node:assert/strict');
const { createPrivacyRequest, processPrivacyRequest, runRetention } = require('../modules/security/privacy-service');

function poolDouble(options = {}) {
  const queries = [];
  const pool = {
    queries,
    async query(text, values) {
      queries.push({ text, values });
      if (/insert into privacy_requests/.test(text)) return { rows: [{ id: values[0], status: 'open', kind: values[3], contact_phone: values[2] }] };
      if (/select \* from privacy_requests/.test(text)) return { rowCount: 1, rows: [{ id: values[0], tenant_id: values[1], kind: options.kind || 'anonymize', contact_phone: '5511999999999', status: 'open', legal_hold: Boolean(options.legalHold) }] };
      if (/select c\.id/.test(text)) return { rowCount: 1, rows: [{ id: 'conversation-1', status: 'open', channel: 'local' }] };
      if (/returning id/.test(text)) return { rowCount: 1, rows: [{ id: 'conversation-1' }] };
      return { rowCount: 1, rows: [] };
    },
    async connect() { return { query: (...args) => pool.query(...args), release() {} }; },
  };
  return pool;
}

test('privacy service creates tenant-scoped requests and processes anonymization transactionally', async () => {
  const pool = poolDouble();
  const created = await createPrivacyRequest(pool, { tenantId: 'tenant-a', actorId: 'agent-a', kind: 'anonymize', target: '5511999999999' });
  assert.equal(created.status, 'open');
  const processed = await processPrivacyRequest(pool, { tenantId: 'tenant-a', requestId: created.id, actorId: 'admin-a' });
  assert.equal(processed.status, 'completed');
  assert.ok(pool.queries.some(query => /where tenant_id=\$1 and contact_phone=\$2/.test(query.text)));
});

test('privacy export returns restricted tenant-scoped records', async () => {
  const pool = poolDouble({ kind: 'export' });
  const processed = await processPrivacyRequest(pool, { tenantId: 'tenant-a', requestId: 'privacy-1', actorId: 'admin-a' });
  assert.deepEqual(processed.result.conversations, [{ id: 'conversation-1', status: 'open', channel: 'local' }]);
  assert.ok(pool.queries.some(query => /select c\.id,c\.status,c\.channel,c\.created_at/.test(query.text)));
});

test('privacy delete removes only matching tenant-scoped conversations', async () => {
  const pool = poolDouble({ kind: 'delete' });
  const processed = await processPrivacyRequest(pool, { tenantId: 'tenant-a', requestId: 'privacy-1', actorId: 'admin-a' });
  assert.equal(processed.result.deleted, true);
  assert.ok(pool.queries.some(query => /^delete from conversations where tenant_id=\$1 and contact_phone=\$2/.test(query.text)));
});

test('privacy request under legal hold is retained and rejected without destructive change', async () => {
  const pool = poolDouble({ kind: 'delete', legalHold: true });
  const processed = await processPrivacyRequest(pool, { tenantId: 'tenant-a', requestId: 'privacy-1', actorId: 'admin-a' });
  assert.equal(processed.status, 'rejected');
  assert.equal(processed.result.retained, true);
  assert.ok(pool.queries.every(query => !/^delete from conversations/i.test(query.text)));
});

test('privacy retention requires tenant and actor context and returns deletion count', async () => {
  const pool = poolDouble();
  await assert.rejects(() => runRetention(pool, { before: new Date().toISOString() }), { code: 'OPERATION_CONTEXT_REQUIRED' });
  const result = await runRetention(pool, { tenantId: 'tenant-a', actorId: 'admin-a', before: new Date().toISOString() });
  assert.equal(result.deletedCount, 1);
});
