const test = require('node:test');
const assert = require('node:assert/strict');
const { isSameOrigin } = require('../security');

test('isSameOrigin accepts a matching Origin header', () => {
  assert.equal(isSameOrigin({ headers: { origin: 'https://crm.tsiapp.io' } }, 'https://crm.tsiapp.io'), true);
});

test('isSameOrigin accepts a matching referer when Origin is omitted', () => {
  assert.equal(isSameOrigin({ headers: { referer: 'https://crm.tsiapp.io/login?next=%2Fapp' } }, 'https://crm.tsiapp.io'), true);
});

test('isSameOrigin rejects a mismatching referer when Origin is omitted', () => {
  assert.equal(isSameOrigin({ headers: { referer: 'https://evil.example/login' } }, 'https://crm.tsiapp.io'), false);
});

test('isSameOrigin keeps supporting non-browser clients without origin metadata', () => {
  assert.equal(isSameOrigin({ headers: {} }, 'https://crm.tsiapp.io'), true);
});
