const test = require('node:test');
const assert = require('node:assert/strict');
const { registerHeartbeat } = require('../modules/operations/worker-health');

test('worker health records heartbeat identity and state', async () => {
  let called = false;
  const pool = {
    async query(sql) {
      assert.match(sql, /worker_heartbeats/);
      called = true;
      return { rowCount: 1 };
    }
  };
  await registerHeartbeat(pool, { workerId: 'worker-1', status: 'active' });
  assert.ok(called);
});
