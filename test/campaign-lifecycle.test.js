const test = require('node:test');
const assert = require('node:assert/strict');
const { createCampaign } = require('../modules/marketing/campaign-service');

test('campaign service manages lifecycle states', () => {
  const camp = createCampaign({ name: 'Campaign 1', status: 'draft' });
  assert.equal(camp.status, 'draft');
});
