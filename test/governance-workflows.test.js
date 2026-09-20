const test = require('node:test');
const assert = require('node:assert/strict');
const { escalateIncident } = require('../modules/governance/governance-service');

test('governance service escalates incident within deadline', () => {
  const result = escalateIncident({ incidentId: 'inc-1', severity: 'high', deadline: new Date(Date.now() + 1000) });
  assert.equal(result.escalated, true);
});
