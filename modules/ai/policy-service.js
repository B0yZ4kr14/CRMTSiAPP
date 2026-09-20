function redactPII(text) {
  if (!text) return '';
  return text.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[REDACTED]');
}

module.exports = { redactPII };
