const test = require('node:test');
const assert = require('node:assert/strict');
const { createCsrfToken, verifyCsrfToken } = require('../security');

test('accepts a CSRF token that is bound to the issuing session', () => {
  const token = createCsrfToken('session-a');
  assert.equal(verifyCsrfToken(token, 'session-a'), true);
});

test('rejects a CSRF token when presented by another session', () => {
  const token = createCsrfToken('session-a');
  assert.equal(verifyCsrfToken(token, 'session-b'), false);
});

test('rejects malformed CSRF tokens without throwing', () => {
  assert.equal(verifyCsrfToken('not-a-token', 'session-a'), false);
});
