const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { decryptCredentials, encryptCredentials } = require('../channel-secrets');

test('channel credentials are authenticated encrypted and reject tampering', () => {
  const key = crypto.randomBytes(32);
  const clear = { apiKey: 'canary-api-key', appSecret: 'canary-app-secret' };
  const ciphertext = encryptCredentials(clear, key);
  assert.doesNotMatch(ciphertext, /canary-api-key|canary-app-secret/);
  assert.deepEqual(decryptCredentials(ciphertext, key), clear);
  assert.throws(() => decryptCredentials(`${ciphertext}tampered`, key));
});
