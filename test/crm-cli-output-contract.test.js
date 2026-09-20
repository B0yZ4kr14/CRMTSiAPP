const test = require('node:test');
const assert = require('node:assert/strict');
const { renderResult, renderError, exitCodeForError, EXIT_CODES, redactValue } = require('../modules/cli/output');

test('CLI output renders stable JSON envelope', () => {
  const result = renderResult({ status: 'ok', data: { id: 'abc' } }, { json: true });
  const parsed = JSON.parse(result);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.data, { status: 'ok', data: { id: 'abc' } });
  assert.ok(parsed.timestamp);
});

test('CLI output renders text envelope', () => {
  const result = renderResult({ status: 'ok', count: 2 }, { json: false });
  assert.match(result, /status: ok/);
  assert.match(result, /count: 2/);
});

test('CLI output redacts secrets recursively', () => {
  const value = {
    password: 'secret',
    accessToken: 'token',
    nested: { apiKey: 'key', normal: 'visible' },
    list: [{ webhookToken: 'wh' }],
  };
  const redacted = redactValue(value);
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.accessToken, '[REDACTED]');
  assert.equal(redacted.nested.apiKey, '[REDACTED]');
  assert.equal(redacted.nested.normal, 'visible');
  assert.equal(redacted.list[0].webhookToken, '[REDACTED]');
});

test('CLI output JSON errors have stable envelope and redact details', () => {
  const error = Object.assign(new Error('password=secret'), { code: 'VALIDATION_ERROR', details: { token: 'abc' } });
  const result = renderError(error, { json: true });
  const parsed = JSON.parse(result);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, 'VALIDATION_ERROR');
  assert.equal(parsed.error.message, 'Operation failed');
  assert.doesNotMatch(JSON.stringify(parsed), /secret|abc/);
});

test('CLI exit code mapping is stable', () => {
  assert.equal(exitCodeForError({ code: 'VALIDATION_ERROR' }), EXIT_CODES.VALIDATION);
  assert.equal(exitCodeForError({ code: 'AUTHORIZATION_DENIED' }), EXIT_CODES.AUTHORIZATION);
  assert.equal(exitCodeForError({ code: 'NOT_FOUND' }), EXIT_CODES.NOT_FOUND);
  assert.equal(exitCodeForError({ code: 'CONFLICT' }), EXIT_CODES.CONFLICT);
  assert.equal(exitCodeForError({ code: 'TIMEOUT' }), EXIT_CODES.TIMEOUT);
  assert.equal(exitCodeForError({ code: 'CANCELLED' }), EXIT_CODES.CANCELLED);
  assert.equal(exitCodeForError({ code: 'UNKNOWN' }), EXIT_CODES.INTERNAL);
});

test('CLI output exit code values match documented contract', () => {
  assert.deepEqual(EXIT_CODES, {
    SUCCESS: 0,
    INTERNAL: 1,
    VALIDATION: 2,
    AUTHORIZATION: 3,
    NOT_FOUND: 4,
    CONFLICT: 5,
    TIMEOUT: 6,
    CANCELLED: 130,
  });
});