const test = require('node:test');
const assert = require('node:assert/strict');
const { validateExpression } = require('../modules/marketing/segment-compiler');

test('segment engine validates expression syntax and type safety', () => {
  const expr = { field: 'leads.value', op: '>', value: 1000 };
  assert.equal(validateExpression(expr), true);
  assert.throws(() => validateExpression({ field: 'unknown', op: '>', value: 0 }), /invalid field/i);
});
