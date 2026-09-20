const test = require('node:test');
const assert = require('node:assert/strict');

const { OperationalError, conflict, forbidden, serializeOperationalError } = require('../modules/shared/operational-errors');

test('operational errors provide stable HTTP and CLI mappings without exposing causes', () => {
  const cause = new Error('database password=do-not-expose');
  const error = conflict('VERSION_CONFLICT', 'resource version changed', { cause, details: { expected: 2, token: 'hidden' } });
  assert.equal(error instanceof OperationalError, true);
  assert.equal(error.httpStatus, 409);
  assert.equal(error.cliExitCode, 4);
  assert.deepEqual(serializeOperationalError(error), {
    error: { code: 'VERSION_CONFLICT', message: 'resource version changed', details: { expected: 2, token: '[REDACTED]' } },
  });
  assert.doesNotMatch(JSON.stringify(serializeOperationalError(error)), /do-not-expose|hidden/);
});

test('unknown errors serialize as stable internal failures', () => {
  const serialized = serializeOperationalError(new Error('sensitive implementation detail'));
  assert.deepEqual(serialized, { error: { code: 'INTERNAL_ERROR', message: 'internal error' } });
  assert.equal(forbidden().httpStatus, 403);
});
