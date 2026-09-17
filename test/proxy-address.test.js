const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeForwardedAddress } = require('../security');

test('uses the direct peer address when the request is not from a trusted proxy', () => {
  assert.equal(normalizeForwardedAddress({ socket: { remoteAddress: '198.51.100.1' }, headers: { 'x-forwarded-for': '203.0.113.8' } }, ['172.20.0.1']), '198.51.100.1');
});

test('uses the first forwarded address only from a trusted proxy', () => {
  assert.equal(normalizeForwardedAddress({ socket: { remoteAddress: '172.20.0.1' }, headers: { 'x-forwarded-for': '203.0.113.8, 172.20.0.1' } }, ['172.20.0.1']), '203.0.113.8');
});

test('falls back to the trusted proxy address when forwarding is absent', () => {
  assert.equal(normalizeForwardedAddress({ socket: { remoteAddress: '172.20.0.1' }, headers: {} }, ['172.20.0.1']), '172.20.0.1');
});
