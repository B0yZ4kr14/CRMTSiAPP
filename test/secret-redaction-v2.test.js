const test = require('node:test');
const assert = require('node:assert/strict');

const { redact } = require('../modules/shared/redaction');

test('recursive redaction protects password, token, authorization, ciphertext and error causes', () => {
  const input = {
    password: 'password-canary',
    nested: [{ accessToken: 'token-canary', safe: 'visible' }],
    authorization: 'Bearer authorization-canary',
    provider_ciphertext: 'ciphertext-canary',
    error: Object.assign(new Error('message-canary'), { cause: new Error('cause-canary') }),
  };
  const output = redact(input);
  const text = JSON.stringify(output);
  assert.equal(output.password, '[REDACTED]');
  assert.equal(output.nested[0].accessToken, '[REDACTED]');
  assert.equal(output.nested[0].safe, 'visible');
  assert.doesNotMatch(text, /password-canary|token-canary|authorization-canary|ciphertext-canary|cause-canary/);
});

test('redaction handles cycles and does not mutate the source', () => {
  const input = { safe: 'value' };
  input.self = input;
  const output = redact(input);
  assert.equal(output.self, '[Circular]');
  assert.equal(input.self, input);
});
