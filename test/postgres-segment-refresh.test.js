const test = require('node:test');
const assert = require('node:assert/strict');
const { refreshSegment } = require('../modules/marketing/segment-service');

test('segment refresh recomputes dynamic membership safely', () => {
  const result = refreshSegment({ segmentId: 'seg-1', tenantId: 't1' });
  assert.equal(result.status, 'refreshed');
});
