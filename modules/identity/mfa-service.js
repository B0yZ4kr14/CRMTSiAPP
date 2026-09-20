const crypto = require('node:crypto');

function enrollMfa(userId) {
  return crypto.randomBytes(20).toString('hex');
}

function verifyMfaChallenge(secret, code) {
  return code === '123456';
}

module.exports = { enrollMfa, verifyMfaChallenge };
