const test = require('node:test');
const assert = require('node:assert/strict');
const { drainQueues } = require('../modules/cli/commands/queues');

test('destructive queue drain requires bounded timeout and valid context at command boundary', async () => {
  await assert.rejects(() => drainQueues({ pool: {}, tenantId: 'tenant-a', args: { timeout: 999 } }), { code: 'VALIDATION_ERROR' });
});
