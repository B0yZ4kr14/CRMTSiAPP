const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSecretInputOptions, readSecretFromStream } = require('../modules/cli/secret-input');

test('CLI secret input rejects secrets placed in argv', () => {
  assert.throws(() => validateSecretInputOptions({ password: 'secret' }), /SECRET_IN_ARGV/);
  assert.throws(() => validateSecretInputOptions({ token: 'secret' }), /SECRET_IN_ARGV/);
});

test('CLI secret input accepts restricted stdin/fd sources only', () => {
  assert.doesNotThrow(() => validateSecretInputOptions({ secretStdin: true }));
  assert.doesNotThrow(() => validateSecretInputOptions({ secretFd: 3 }));
  assert.throws(() => validateSecretInputOptions({ secretFd: 2 }), /SECRET_FD_INVALID/);
});

test('CLI secret input reads bounded secret from stdin and trims terminal newline', async () => {
  async function* source() { yield Buffer.from('a-secret\n'); }
  const secret = await readSecretFromStream(source(), { maxBytes: 128 });
  assert.equal(secret, 'a-secret');
});

test('CLI secret input rejects oversized or empty stdin secrets', async () => {
  async function* oversized() { yield Buffer.from('x'.repeat(20)); }
  await assert.rejects(readSecretFromStream(oversized(), { maxBytes: 10 }), /SECRET_TOO_LARGE/);
  async function* blank() { yield Buffer.from('\n'); }
  await assert.rejects(readSecretFromStream(blank(), { maxBytes: 10 }), /SECRET_REQUIRED/);
});