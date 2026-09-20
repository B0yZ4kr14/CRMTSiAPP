const test = require('node:test');
const assert = require('node:assert/strict');
const { drainQueues } = require('../modules/cli/commands/queues');

test('queue drain rejects invalid timeout before touching the database', async () => {
  let touched = false;
  await assert.rejects(() => drainQueues({ pool: { query: async () => { touched = true; } }, tenantId: 'tenant-a', args: { timeoutMs: 0 } }), { code: 'VALIDATION_ERROR' });
  assert.equal(touched, false);
});

test('queue drain pauses claims, waits for leases and resumes without deleting jobs', async () => {
  const calls = [];
  const pool = { async query(text, values) { calls.push({ text, values }); if (/count\(\*\)::int as count/.test(text)) return { rows: [{ count: 0 }] }; return { rowCount: 1, rows: [] }; } };
  const result = await drainQueues({ pool, tenantId: 'tenant-a', args: { timeoutMs: 1000 } });
  assert.equal(result.drained, true);
  assert.ok(calls.some(call => /claims_paused,updated_at\)values\(\$1,true,now\(\)\)/.test(call.text.replace(/\s+/g, ''))));
  assert.ok(calls.some(call => /claims_paused,updated_at\)values\(\$1,false,now\(\)\)/.test(call.text.replace(/\s+/g, ''))));
  assert.ok(calls.every(call => !/^\s*delete\b/i.test(call.text)));
});
