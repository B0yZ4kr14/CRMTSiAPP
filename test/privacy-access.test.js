const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePrivacyRequest } = require('../modules/security/privacy-service');

test('privacy service validates anonymization request', () => {
  const req = { kind: 'anonymize', contactPhone: '5511999999999' };
  assert.equal(validatePrivacyRequest(req), true);
});
