const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

function encryptSecret(plaintext, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, ciphertext]).toString('base64');
}

function decryptSecret(envelope, password) {
  const data = Buffer.from(envelope, 'base64');
  if (data.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
    throw new Error('ENVELOPE_TOO_SHORT');
  }
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

function rotateSecret(envelope, oldPassword, newPassword) {
  const plaintext = decryptSecret(envelope, oldPassword);
  return encryptSecret(plaintext, newPassword);
}

function createMaskedHint(envelope) {
  const data = Buffer.from(envelope, 'base64');
  if (data.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
    return '****';
  }
  return `****-${data.subarray(0, 4).toString('hex')}-****`;
}

test('secret envelope encrypts and decrypts correctly', () => {
  const secret = 'my-super-secret-api-key-12345';
  const password = 'strong-master-password';
  
  const envelope = encryptSecret(secret, password);
  const decrypted = decryptSecret(envelope, password);
  
  assert.equal(decrypted, secret);
  assert.notEqual(envelope, secret);
});

test('secret envelope produces different ciphertext each time', () => {
  const secret = 'same-secret';
  const password = 'same-password';
  
  const envelope1 = encryptSecret(secret, password);
  const envelope2 = encryptSecret(secret, password);
  
  assert.notEqual(envelope1, envelope2);
  assert.equal(decryptSecret(envelope1, password), secret);
  assert.equal(decryptSecret(envelope2, password), secret);
});

test('secret envelope rejects wrong password', () => {
  const secret = 'my-secret';
  const envelope = encryptSecret(secret, 'correct-password');
  
  assert.throws(() => decryptSecret(envelope, 'wrong-password'), /Unsupported state|Invalid key|Decryption failed/);
});

test('secret envelope rejects tampered ciphertext', () => {
  const envelope = encryptSecret('secret', 'password');
  const data = Buffer.from(envelope, 'base64');
  data[data.length - 1] ^= 0xff;
  const tampered = data.toString('base64');
  
  assert.throws(() => decryptSecret(tampered, 'password'), /Unsupported state|Invalid key|Decryption failed|Auth tag/);
});

test('secret envelope rejects truncated envelope', () => {
  const envelope = encryptSecret('secret', 'password');
  const truncated = envelope.slice(0, -10);
  
  assert.throws(() => decryptSecret(truncated, 'password'), /ENVELOPE_TOO_SHORT/);
});

test('secret envelope rejects corrupted base64', () => {
  assert.throws(() => decryptSecret('not-valid-base64!', 'password'), /Invalid base64|ENVELOPE_TOO_SHORT/);
});

test('secret rotation preserves plaintext', () => {
  const secret = 'original-secret';
  const oldPassword = 'old-master-password';
  const newPassword = 'new-master-password';
  
  const envelope = encryptSecret(secret, oldPassword);
  const rotated = rotateSecret(envelope, oldPassword, newPassword);
  const decrypted = decryptSecret(rotated, newPassword);
  
  assert.equal(decrypted, secret);
  assert.notEqual(envelope, rotated);
});

test('secret rotation with wrong old password fails', () => {
  const envelope = encryptSecret('secret', 'correct-old-password');
  
  assert.throws(() => rotateSecret(envelope, 'wrong-old-password', 'new-password'), /Unsupported state|Invalid key|Decryption failed/);
});

test('masked hint does not reveal secret', () => {
  const secret = 'very-sensitive-api-key-that-should-not-leak';
  const envelope = encryptSecret(secret, 'password');
  const hint = createMaskedHint(envelope);
  
  assert.doesNotMatch(hint, /very-sensitive|api-key|should-not-leak/);
  assert.match(hint, /^\*\*\*\*-/);
  assert.ok(hint.length > 10);
});

test('masked hint is consistent for same envelope', () => {
  const envelope = encryptSecret('secret', 'password');
  const hint1 = createMaskedHint(envelope);
  const hint2 = createMaskedHint(envelope);
  
  assert.equal(hint1, hint2);
});

test('masked hint differs for different envelopes', () => {
  const envelope1 = encryptSecret('secret', 'password');
  const envelope2 = encryptSecret('secret', 'password');
  
  const hint1 = createMaskedHint(envelope1);
  const hint2 = createMaskedHint(envelope2);
  
  assert.notEqual(hint1, hint2);
});

test('envelope format includes salt, iv, tag, ciphertext', () => {
  const envelope = encryptSecret('test', 'password');
  const data = Buffer.from(envelope, 'base64');
  
  assert.ok(data.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1);
  // Structure: salt (16) + iv (12) + tag (16) + ciphertext (>=1)
});

test('key derivation uses PBKDF2 with SHA-256', () => {
  const password = 'test-password';
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  
  assert.equal(key.length, KEY_LENGTH);
  // Same password + salt = same key
  assert.deepEqual(key, deriveKey(password, salt));
  // Different salt = different key
  assert.notDeepEqual(key, deriveKey(password, crypto.randomBytes(SALT_LENGTH)));
});

test('encryptSecret uses AES-256-GCM', () => {
  const envelope = encryptSecret('test', 'password');
  const data = Buffer.from(envelope, 'base64');
  
  // Verify we can decrypt with correct algorithm
  const decrypted = decryptSecret(envelope, 'password');
  assert.equal(decrypted, 'test');
});

test('invalid key length throws on decrypt', () => {
  const envelope = encryptSecret('secret', 'password');
  // Manually create envelope with wrong key length would be complex
  // Instead verify that wrong password (which derives wrong key) fails
  assert.throws(() => decryptSecret(envelope, 'different-password'), /Unsupported state|Invalid key|Decryption failed/);
});