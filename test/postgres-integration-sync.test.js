const test = require('node:test');
const assert = require('node:assert/strict');

const { SyncService } = require('../modules/integrations/sync-service');

test('sync service records a successful external version and suppresses an unchanged replay', async () => {
  const calls = [];
  const service = new SyncService({
    adapter: { upsert: async payload => { calls.push(payload); return { externalVersion: 'v1' }; } },
  });
  const input = { tenantId: 'tenant-a', integration: 'customer', entityId: 'customer-1', version: 1, payload: { name: 'Ana' } };

  assert.deepEqual(await service.sync(input), { status: 'synced', externalVersion: 'v1' });
  assert.deepEqual(await service.sync(input), { status: 'duplicate', externalVersion: 'v1' });
  assert.equal(calls.length, 1);
});

test('sync service detects an external-version conflict without overwriting the remote state', async () => {
  let calls = 0;
  const service = new SyncService({
    adapter: { upsert: async () => { calls += 1; const error = new Error('external version conflict'); error.code = 'VERSION_CONFLICT'; throw error; } },
  });

  const result = await service.sync({ tenantId: 'tenant-a', integration: 'ticket', entityId: 'ticket-1', version: 2, payload: { subject: 'Help' } });
  assert.deepEqual(result, { status: 'conflict', reason: 'external version conflict' });
  assert.equal(calls, 1);
});

test('sync service opens a circuit after consecutive retryable failures and exposes reconciliation state', async () => {
  let calls = 0;
  const service = new SyncService({
    failureThreshold: 2,
    adapter: { upsert: async () => { calls += 1; const error = new Error('timeout'); error.retryable = true; throw error; } },
  });
  const input = { tenantId: 'tenant-a', integration: 'calendar', entityId: 'event-1', version: 1, payload: {} };

  assert.deepEqual(await service.sync(input), { status: 'retryable_failure', reason: 'timeout' });
  assert.deepEqual(await service.sync({ ...input, version: 2 }), { status: 'retryable_failure', reason: 'timeout' });
  assert.deepEqual(await service.sync({ ...input, version: 3 }), { status: 'circuit_open', reason: 'integration circuit is open' });
  assert.equal(calls, 2);
  assert.deepEqual(service.reconciliation(), [{ integration: 'calendar', failures: 2, circuitOpen: true }]);
});
