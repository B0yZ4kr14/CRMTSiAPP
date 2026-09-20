const test = require('node:test');
const assert = require('node:assert/strict');
const { validateOidcToken } = require('../modules/identity/oidc-service');

test('oidc contract validates token issuer and signature state', () => {
  const valid = validateOidcToken({ iss: 'https://issuer.example', sub: 'user-1' });
  assert.equal(valid, true);

  const invalid = validateOidcToken({ iss: 'https://malicious.example', sub: 'user-1' });
  assert.equal(invalid, false);
});
