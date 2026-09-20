const test = require('node:test');
const assert = require('node:assert/strict');
const { dispatchCampaign } = require('../modules/marketing/campaign-dispatch');

test('campaign dispatch is idempotent and respects published content and profile versions', () => {
  const first = dispatchCampaign({ campaignId: 'c1', campaignVersion: 1, capabilityProfileVersion: 1, recipients: ['u1', 'u2'] });
  const second = dispatchCampaign({ campaignId: 'c1', campaignVersion: 1, capabilityProfileVersion: 1, recipients: ['u1', 'u2'] });
  const newVersion = dispatchCampaign({ campaignId: 'c1', campaignVersion: 2, capabilityProfileVersion: 1, recipients: ['u1'] });
  assert.equal(first.sent, 2);
  assert.equal(second.sent, 0);
  assert.equal(newVersion.sent, 1);
  assert.equal(newVersion.campaignVersion, 2);
});
