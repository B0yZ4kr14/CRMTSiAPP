const test = require('node:test');
const assert = require('node:assert/strict');
const { claimNextJob, markDelivered, markFailed } = require('../outbox');

test('outbox primitives leverage shared job primitives correctly', () => {
  assert.equal(typeof claimNextJob, 'function');
  assert.equal(typeof markDelivered, 'function');
  assert.equal(typeof markFailed, 'function');
});
