const crypto = require('crypto');

function keyFromEnvironment(value = process.env.CHANNEL_SECRET_KEY) {
  if (!value) return null;
  const source = String(value).trim();
  const encoded = /^[A-Fa-f0-9]{64}$/.test(source) ? Buffer.from(source, 'hex') : Buffer.from(source, 'base64');
  if (encoded.length !== 32) throw new Error('CHANNEL_SECRET_KEY must encode exactly 32 bytes');
  return encoded;
}

function encryptCredentials(credentials, key = keyFromEnvironment()) {
  if (!key) throw new Error('CHANNEL_SECRET_KEY is required before storing channel credentials');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(credentials), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
}

function decryptCredentials(value, key = keyFromEnvironment()) {
  if (!key) throw new Error('CHANNEL_SECRET_KEY is required before using channel credentials');
  const [version, ivPart, tagPart, ciphertextPart] = String(value || '').split('.');
  if (version !== 'v1' || !ivPart || !tagPart || !ciphertextPart) throw new Error('channel credentials have an unsupported ciphertext format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextPart, 'base64url')), decipher.final()]);
  const parsed = JSON.parse(plaintext.toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('channel credentials are malformed');
  return parsed;
}

module.exports = { decryptCredentials, encryptCredentials, keyFromEnvironment };
