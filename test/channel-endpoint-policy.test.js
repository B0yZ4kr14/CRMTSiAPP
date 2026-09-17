const test = require('node:test');
const assert = require('node:assert/strict');
const { isTrustedUrl } = require('../server');

test('channel endpoint policy rejects loopback, link-local and private address spellings', () => {
  for (const value of [
    'http://127.0.0.1:3000',
    'http://127.1:3000',
    'http://2130706433:3000',
    'http://0.0.0.0:3000',
    'http://[::1]:3000',
    'http://169.254.169.254/latest/meta-data',
    'http://172.21.10.1:3000',
    'http://192.168.1.1:3000',
    'http://10.0.0.1:3000',
  ]) assert.equal(isTrustedUrl(value), false, value);
});

test('channel endpoint policy allows only public HTTP(S) endpoints', () => {
  assert.equal(isTrustedUrl('https://waha.example.test'), true);
  assert.equal(isTrustedUrl('ftp://waha.example.test'), false);
});
