const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCookies, isSameOrigin } = require('../security');

test('parseCookies ignores malformed cookie encoding instead of throwing', () => {
  assert.deepEqual(parseCookies({ headers: { cookie: 'bad=%E0%A4%A; valid=ok' } }), { valid: 'ok' });
});

test('isSameOrigin permits CRM form submissions with the canonical origin', () => {
  assert.equal(isSameOrigin({ headers: { origin: 'https://crm.tsiapp.io' } }, 'https://crm.tsiapp.io'), true);
});

test('isSameOrigin rejects cross-origin form submissions', () => {
  assert.equal(isSameOrigin({ headers: { origin: 'https://evil.example' } }, 'https://crm.tsiapp.io'), false);
});

test('isSameOrigin permits non-browser requests without an Origin header', () => {
  assert.equal(isSameOrigin({ headers: {} }, 'https://crm.tsiapp.io'), true);
});
