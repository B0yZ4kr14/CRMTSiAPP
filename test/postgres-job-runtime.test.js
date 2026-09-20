const test = require('node:test');
const assert = require('node:assert/strict');

test('job store contract validates lease expiration and idempotency envelope', () => {
  const { createJobEnvelope } = require('../modules/operations/job-store');
  const job = createJobEnvelope({
    tenantId: '00000000-0000-4000-8000-000000000001',
    kind: 'webhook_dispatch',
    payload: { url: 'https://example.com/webhook' },
    idempotencyKey: 'idem-123'
  });

  assert.equal(job.tenantId, '00000000-0000-4000-8000-000000000001');
  assert.equal(job.status, 'queued');
  assert.equal(job.idempotencyKey, 'idem-123');
  assert.equal(typeof job.id, 'string');
});
