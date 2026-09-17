const test = require('node:test');
const assert = require('node:assert/strict');
const { nextRetryAt, classifyFailure } = require('../outbox');

test('outbox retry uses bounded exponential backoff with deterministic cap', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  assert.equal(nextRetryAt({ attempts: 1, now }).toISOString(), '2026-01-01T00:00:02.000Z');
  assert.equal(nextRetryAt({ attempts: 10, now }).toISOString(), '2026-01-01T00:05:00.000Z');
});

test('outbox classifies terminal provider failures separately from retryable failures', () => {
  assert.deepEqual(classifyFailure({ status: 400 }), { terminal: true, reason: 'provider HTTP 400' });
  assert.deepEqual(classifyFailure({ status: 429 }), { terminal: false, reason: 'provider HTTP 429' });
  assert.deepEqual(classifyFailure(new Error('network timeout')), { terminal: false, reason: 'network timeout' });
});