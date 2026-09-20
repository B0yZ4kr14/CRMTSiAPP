const SECRET_KEYS = /password|secret|token|api[_-]?key|authorization|ciphertext|credential/i;

const EXIT_CODES = Object.freeze({
  SUCCESS: 0,
  INTERNAL: 1,
  VALIDATION: 2,
  AUTHORIZATION: 3,
  NOT_FOUND: 4,
  CONFLICT: 5,
  TIMEOUT: 6,
  CANCELLED: 130,
});

function redactValue(value) {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SECRET_KEYS.test(key) ? '[REDACTED]' : redactValue(item);
  }
  return result;
}

function normalizeError(error) {
  const code = error?.code || 'INTERNAL_ERROR';
  return {
    code,
    message: 'Operation failed',
    details: error?.details ? redactValue(error.details) : undefined,
  };
}

function renderText(value, prefix = '') {
  if (value === null || value === undefined) return `${prefix}null`;
  if (Array.isArray(value)) return value.map((item, index) => renderText(item, `${prefix}${index}.`)).join('\n');
  if (typeof value !== 'object') return `${prefix}${value}`;
  return Object.entries(value).map(([key, item]) => {
    if (item && typeof item === 'object') return `${prefix}${key}:\n${renderText(item, `${prefix}  `)}`;
    return `${prefix}${key}: ${item}`;
  }).join('\n');
}

function renderResult(data, options = {}) {
  const sanitized = redactValue(data);
  if (options.json) {
    return JSON.stringify({ ok: true, data: sanitized, timestamp: new Date().toISOString() });
  }
  return renderText(sanitized);
}

function renderError(error, options = {}) {
  const normalized = normalizeError(error);
  if (options.json) {
    const response = { ok: false, error: { code: normalized.code, message: normalized.message }, timestamp: new Date().toISOString() };
    if (normalized.details !== undefined) response.error.details = normalized.details;
    return JSON.stringify(response);
  }
  return `error: ${normalized.code}\nmessage: ${normalized.message}`;
}

function exitCodeForError(error) {
  const code = error?.code || error;
  if (code === 'VALIDATION_ERROR' || code === 'UNKNOWN_GLOBAL_OPTION' || code === 'COMMAND_REQUIRED' || code === 'SECRET_IN_ARGV' || code === 'TENANT_REQUIRED' || code === 'IDEMPOTENCY_KEY_REQUIRED' || code === 'CONFIRMATION_REQUIRED') return EXIT_CODES.VALIDATION;
  if (code === 'AUTHORIZATION_DENIED' || code === 'FORBIDDEN') return EXIT_CODES.AUTHORIZATION;
  if (code === 'NOT_FOUND' || code === 'PROVIDER_NOT_FOUND') return EXIT_CODES.NOT_FOUND;
  if (code === 'CONFLICT' || code === 'ALREADY_ACTIVE' || code === 'IDEMPOTENCY_CONFLICT') return EXIT_CODES.CONFLICT;
  if (code === 'TIMEOUT' || code === 'OPERATION_TIMEOUT') return EXIT_CODES.TIMEOUT;
  if (code === 'CANCELLED' || code === 'SIGINT') return EXIT_CODES.CANCELLED;
  return EXIT_CODES.INTERNAL;
}

module.exports = { EXIT_CODES, redactValue, normalizeError, renderText, renderResult, renderError, exitCodeForError };