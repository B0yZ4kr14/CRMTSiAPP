const test = require('node:test');
const assert = require('node:assert/strict');
const { createAlertService } = require('../modules/reporting/alert-service');

const now = () => new Date('2026-09-20T00:00:00.000Z');

test('alert evaluator deduplicates an active breach and escalates only after its deadline', () => {
  const service = createAlertService({ now });
  const rule = { id: 'outbox-age', threshold: 300, escalationSeconds: 60, severity: 'high' };
  const first = service.evaluate({ tenantId: 'tenant-a', rule, observed: 301 });
  const repeated = service.evaluate({ tenantId: 'tenant-a', rule, observed: 500 });
  assert.equal(first.status, 'open');
  assert.equal(repeated.id, first.id);
  assert.equal(service.escalateDue(new Date('2026-09-20T00:00:30.000Z')).length, 0);
  assert.equal(service.escalateDue(new Date('2026-09-20T00:01:01.000Z'))[0].status, 'escalated');
});

test('acknowledgement is tenant-scoped and a recovered signal resolves the open alert', () => {
  const service = createAlertService({ now });
  const rule = { id: 'provider-state', threshold: 0, escalationSeconds: 60, severity: 'medium' };
  const alert = service.evaluate({ tenantId: 'tenant-a', rule, observed: 1 });
  assert.throws(() => service.acknowledge({ tenantId: 'tenant-b', alertId: alert.id, actorId: 'operator' }), /tenant/i);
  const acknowledged = service.acknowledge({ tenantId: 'tenant-a', alertId: alert.id, actorId: 'operator' });
  assert.equal(acknowledged.status, 'acknowledged');
  const resolved = service.evaluate({ tenantId: 'tenant-a', rule, observed: 0 });
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.acknowledgedBy, 'operator');
});
