const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateSystemStatus } = require('../modules/operations/system-status');

test('system status distinguishes liveness from readiness and exposes actionable degraded components', () => {
  const live = evaluateSystemStatus({ database: false, outboxAgeSeconds: 999, webhookAgeSeconds: 999, workers: [] });
  assert.equal(live.live.ok, true);
  assert.equal(live.ready.ok, false);
  assert.deepEqual([...live.ready.degraded].sort(), ['database', 'outbox', 'webhooks']);
});

test('system status includes stale workers, retry and DLQ pressure without concealing readiness', () => {
  const status = evaluateSystemStatus({
    database: true,
    outboxAgeSeconds: 10,
    webhookAgeSeconds: 10,
    workers: [{ worker: 'outbox', ageSeconds: 301, status: 'active' }],
    retryCount: 4,
    deadLetterCount: 2,
    providerStates: [{ provider: 'waha', state: 'degraded' }],
    release: 'release-1',
  });
  assert.equal(status.live.ok, true);
  assert.equal(status.ready.ok, false);
  assert.deepEqual(status.ready.degraded, ['worker:outbox', 'provider:waha']);
  assert.equal(status.backlog.retryCount, 4);
  assert.equal(status.backlog.deadLetterCount, 2);
  assert.equal(status.release, 'release-1');
});
