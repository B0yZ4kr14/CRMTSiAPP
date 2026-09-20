const crypto = require('node:crypto');

function verifyWebhookSignature({ payload, signature, secret }) {
  if (!signature || !signature.startsWith('sha256=')) return false;
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expected = `sha256=${hash}`;
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

module.exports = { verifyWebhookSignature };
