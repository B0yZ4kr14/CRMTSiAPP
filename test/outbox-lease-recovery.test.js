const test = require('node:test');
const assert = require('node:assert/strict');
const { claimNextJob } = require('../outbox');

test('claim query isolates jobs whose delivery outcome became ambiguous after lease expiry', async () => {
  let sql = '';
  await claimNextJob({ query: async (text) => { sql = text; return { rows: [] }; } }, 'worker-1');
  assert.match(sql, /status='processing'/);
  assert.match(sql, /status='delivery_unknown'/);
  assert.match(sql, /locked_at < now\(\) - interval '2 minutes'/);
  assert.match(sql, /for update skip locked/);
});
