const test = require('node:test');
const assert = require('node:assert/strict');
const { createOperationRunner } = require('../modules/cli/operation-runner');

test('operation runner executes once and replays the completed idempotent result', async () => {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('insert into operational_idempotency_keys')) return { rowCount: 1, rows: [{ id: 'op-1' }] };
      if (sql.includes("set status='completed'")) return { rowCount: 1, rows: [] };
      throw new Error(`unexpected query: ${sql}`);
    },
  };
  const runner = createOperationRunner({ withTransaction: async fn => fn(client) });
  const first = await runner.run({ tenantId: 'tenant-a', actorId: 'admin-a', key: 'key-1', operation: 'queues:drain', request: { timeout: 30 } }, async () => ({ drained: 2 }));
  assert.equal(first.replayed, false);
  assert.deepEqual(first.result, { drained: 2 });
  assert.equal(calls.filter(call => call.sql.includes('insert into operational_idempotency_keys')).length, 1);
});

test('operation runner replays a completed result without invoking the effect', async () => {
  let effects = 0;
  const client = {
    async query(sql) {
      if (sql.includes('insert into operational_idempotency_keys')) return { rowCount: 0, rows: [] };
      if (sql.includes('select request_hash,status,response_status,response_body')) return {
        rowCount: 1,
        rows: [{ request_hash: require('../modules/shared/idempotency-service').requestFingerprint({ timeout: 30 }), status: 'completed', response_status: 200, response_body: { drained: 2 } }],
      };
      throw new Error(`unexpected query: ${sql}`);
    },
  };
  const runner = createOperationRunner({ withTransaction: async fn => fn(client) });
  const replay = await runner.run({ tenantId: 'tenant-a', actorId: 'admin-a', key: 'key-1', operation: 'queues:drain', request: { timeout: 30 } }, async () => { effects += 1; return { drained: 99 }; });
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.result, { drained: 2 });
  assert.equal(effects, 0);
});

test('operation runner rejects an in-progress key instead of duplicating an effect', async () => {
  const client = {
    async query(sql) {
      if (sql.includes('insert into operational_idempotency_keys')) return { rowCount: 0, rows: [] };
      if (sql.includes('select request_hash,status,response_status,response_body')) return {
        rowCount: 1,
        rows: [{ request_hash: require('../modules/shared/idempotency-service').requestFingerprint({ timeout: 30 }), status: 'processing', response_status: null, response_body: null }],
      };
      throw new Error(`unexpected query: ${sql}`);
    },
  };
  const runner = createOperationRunner({ withTransaction: async fn => fn(client) });
  await assert.rejects(runner.run({ tenantId: 'tenant-a', actorId: 'admin-a', key: 'key-1', operation: 'queues:drain', request: { timeout: 30 } }, async () => ({ drained: 2 })), /OPERATION_IN_PROGRESS/);
});