const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLogin } = require('../auth');

test('maps the visible admin login to the canonical administrator email', () => {
  assert.equal(normalizeLogin('admin'), 'admin@tsiapp.io');
});

test('normalizes canonical emails without changing the identity', () => {
  assert.equal(normalizeLogin(' ADMIN@TSIAPP.IO '), 'admin@tsiapp.io');
});
