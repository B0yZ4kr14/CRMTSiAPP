const test = require('node:test');
const assert = require('node:assert/strict');
const { getRecoveryStats } = require('../modules/operations/recovery-service');

test('recovery service provides DLQ and retry statistics', () => {
  const stats = getRecoveryStats({ tenantId: 't1' });
  assert.equal(typeof stats.dlqCount, 'number');
  assert.equal(typeof stats.retryableCount, 'number');
});
