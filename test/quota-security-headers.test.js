const test = require('node:test');
const assert = require('node:assert/strict');
const { checkQuota } = require('../modules/security/quota-service');

test('quota service enforces resource limits per tenant', () => {
  const allowed = checkQuota({ tenantId: 't1', currentUsage: 5, limit: 10 });
  assert.equal(allowed, true);

  const exceeded = checkQuota({ tenantId: 't1', currentUsage: 10, limit: 10 });
  assert.equal(exceeded, false);
});
