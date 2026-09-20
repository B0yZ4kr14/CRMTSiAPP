const test = require('node:test');
const assert = require('node:assert/strict');
const { validateOpportunity } = require('../modules/crm/opportunity-service');

test('opportunity service validates pipeline stages', () => {
  const op = { pipelineId: 'p1', stage: 'negotiation' };
  assert.equal(validateOpportunity(op), true);
});
