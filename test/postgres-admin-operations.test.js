const test = require('node:test');
const assert = require('node:assert/strict');
const { createOperationRunner } = require('../modules/cli/operation-runner');
const { requestFingerprint } = require('../modules/shared/idempotency-service');

function clientDouble() {
  const rows = new Map();
  return {
    async query(text, values) {
      if (/insert into operational_idempotency_keys/.test(text)) {
        const [tenantId, key, operation, requestHash] = values;
        const mapKey = `${tenantId}:${key}:${operation}`;
        if (rows.has(mapKey)) return { rowCount: 0, rows: [] };
        const record = { request_hash: requestHash, status: 'processing', response_status: null, response_body: null };
        rows.set(mapKey, record);
        return { rowCount: 1, rows: [{ id: 'op-1' }] };
      }
      if (/select request_hash,status,response_status,response_body/.test(text)) {
        const [tenantId, key, operation] = values;
        return { rowCount: rows.has(`${tenantId}:${key}:${operation}`) ? 1 : 0, rows: rows.has(`${tenantId}:${key}:${operation}`) ? [rows.get(`${tenantId}:${key}:${operation}`)] : [] };
      }
      if (/update operational_idempotency_keys/.test(text)) {
        const [tenantId, key, operation, responseStatus, responseBody] = values;
        const record = rows.get(`${tenantId}:${key}:${operation}`);
        if (record) Object.assign(record, { status: 'completed', response_status: responseStatus, response_body: JSON.parse(responseBody) });
        return { rowCount: record ? 1 : 0, rows: [] };
      }
      throw new Error(`unexpected query: ${text}`);
    },
  };
}

test('admin operation runner is idempotent and replays the same request', async () => {
  const client = clientDouble();
  const runner = createOperationRunner({ client });
  let calls = 0;
  const context = { tenantId: 'tenant-a', actorId: 'admin-a', key: 'key-a', operation: 'admin.create', request: { email: 'a@example.com' } };

  const first = await runner.run(context, async () => { calls += 1; return { created: true }; });
  const second = await runner.run(context, async () => { calls += 1; return { created: true }; });

  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(calls, 1);
  assert.equal(requestFingerprint(context.request).length, 64);
});

test('admin operation runner rejects idempotency key collision with divergent input', async () => {
  const client = clientDouble();
  const runner = createOperationRunner({ client });
  const context = { tenantId: 'tenant-a', actorId: 'admin-a', key: 'key-a', operation: 'admin.create', request: { email: 'a@example.com' } };
  await runner.run(context, async () => ({ created: true }));
  await assert.rejects(
    () => runner.run({ ...context, request: { email: 'b@example.com' } }, async () => ({ created: true })),
    { code: 'IDEMPOTENCY_CONFLICT' },
  );
});
