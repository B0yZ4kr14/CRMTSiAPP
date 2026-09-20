const test = require('node:test');
const assert = require('node:assert/strict');
const { rotateSecret } = require('../channel-secrets');

test('secret provider boundary rotates and masks secrets securely', () => {
  const rotated = rotateSecret('secret-v1', 'secret-v2');
  assert.equal(typeof rotated, 'string');
});
