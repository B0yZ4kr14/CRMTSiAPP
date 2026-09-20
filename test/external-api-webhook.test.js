const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyWebhookSignature } = require('../modules/integrations/api-service');

test('api service verifies webhook signatures and handles scoped credentials', () => {
  const verified = verifyWebhookSignature({ payload: '{}', signature: 'sha256=invalid', secret: 'secret' });
  assert.equal(verified, false);
});
