const SENSITIVE_KEY = /(?:password|passphrase|secret|token|authorization|cookie|ciphertext|credential|private[_-]?key|api[_-]?key)/i;

function redact(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: '[REDACTED]',
      code: value.code,
    };
  }
  if (Buffer.isBuffer(value)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map(entry => redact(entry, seen));

  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(entry, seen);
  }
  return output;
}

module.exports = { SENSITIVE_KEY, redact };
