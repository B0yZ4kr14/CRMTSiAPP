const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateBreach } = require('../modules/inbox/sla-service');

test('sla service calculates breach based on deadline', () => {
  const deadline = new Date(Date.now() - 1000);
  assert.equal(calculateBreach(deadline), true);
  
  const future = new Date(Date.now() + 10000);
  assert.equal(calculateBreach(future), false);
});
