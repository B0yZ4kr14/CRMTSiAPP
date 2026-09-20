const test = require('node:test');
const assert = require('node:assert/strict');
const { listWorkers } = require('../modules/cli/commands/workers');

test('workers list is tenant-scoped and reports stale heartbeats', async () => {
  const calls = [];
  const pool = { async query(text, values) { calls.push({ text, values }); return { rows: [{ worker_id: 'worker-a', tenant_id: 'tenant-a', last_heartbeat_at: new Date(Date.now() - 120000).toISOString(), claims_paused: true }] }; } };
  const workers = await listWorkers({ pool, tenantId: 'tenant-a', staleAfterMs: 60000 });
  assert.deepEqual(calls[0].values, ['tenant-a']);
  assert.match(calls[0].text, /tenant_id=\$1/);
  assert.equal(workers[0].workerId, 'worker-a');
  assert.equal(workers[0].tenantId, 'tenant-a');
  assert.equal(workers[0].stale, true);
  assert.equal(workers[0].claimsPaused, true);
});
