const { redact } = require('./redaction');

const DEFINITIONS = Object.freeze({
  FORBIDDEN: { httpStatus: 403, cliExitCode: 3, message: 'forbidden' },
  NOT_FOUND: { httpStatus: 404, cliExitCode: 3, message: 'not found' },
  VERSION_CONFLICT: { httpStatus: 409, cliExitCode: 4, message: 'conflict' },
  IDEMPOTENCY_CONFLICT: { httpStatus: 409, cliExitCode: 4, message: 'idempotency conflict' },
  VALIDATION_FAILED: { httpStatus: 422, cliExitCode: 2, message: 'validation failed' },
  INTERNAL_ERROR: { httpStatus: 500, cliExitCode: 1, message: 'internal error' },
});

class OperationalError extends Error {
  constructor(code, message, options = {}) {
    const definition = DEFINITIONS[code] || DEFINITIONS.INTERNAL_ERROR;
    super(message || definition.message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'OperationalError';
    this.code = DEFINITIONS[code] ? code : 'INTERNAL_ERROR';
    this.httpStatus = definition.httpStatus;
    this.cliExitCode = definition.cliExitCode;
    this.details = redact(options.details || {});
  }
}

function conflict(code = 'VERSION_CONFLICT', message, options) {
  return new OperationalError(code, message, options);
}

function forbidden(message = 'forbidden', options) {
  return new OperationalError('FORBIDDEN', message, options);
}

function serializeOperationalError(error) {
  if (!(error instanceof OperationalError)) {
    return { error: { code: 'INTERNAL_ERROR', message: DEFINITIONS.INTERNAL_ERROR.message } };
  }
  const payload = { code: error.code, message: error.message };
  if (Object.keys(error.details).length > 0) payload.details = error.details;
  return { error: payload };
}

module.exports = { DEFINITIONS, OperationalError, conflict, forbidden, serializeOperationalError };
