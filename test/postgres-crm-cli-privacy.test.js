const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePrivacyRequest } = require('../modules/security/privacy-service');

test('privacy request rejects missing target or unsupported operation', () => {
  assert.equal(validatePrivacyRequest({ kind: 'delete', contactPhone: '5511999999999' }), true);
  assert.equal(validatePrivacyRequest({ kind: 'delete' }), false);
});
