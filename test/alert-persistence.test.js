const test = require('node:test');
const assert = require('node:assert/strict');
const { createPersistentAlertService } = require('../modules/reporting/alert-service');

function memoryPool() {
  const rows = new Map();
  return {
    rows,
    async query(sql, values = []) {
      const text = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
      if (text.startsWith('select') && text.includes('from alert_instances')) {
        const row = rows.get(`${values[0]}:${values[1]}`);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }
      if (text.startsWith('insert into alert_instances')) {
        const row = { id: values[0], tenant_id: values[1], rule_id: values[2], severity: values[3], status: values[4], observed_value: values[5], escalation_due_at: values[6], correlation_id: values[7], acknowledged_by: null };
        rows.set(`${row.tenant_id}:${row.rule_id}`, row);
        return { rows: [row], rowCount: 1 };
      }
      if (text.startsWith('update alert_instances')) {
        const row = rows.get(`${values[0]}:${values[1]}`);
        if (!row) return { rows: [], rowCount: 0 };
        if (text.includes("status='acknowledged'")) Object.assign(row, { status: 'acknowledged', acknowledged_by: values[2] });
        else if (text.includes("status='resolved'")) Object.assign(row, { status: 'resolved', resolved_at: values[2] });
        return { rows: [row], rowCount: 1 };
      }
      throw new Error(`unexpected SQL: ${sql}`);
    },
  };
}

test('persistent alert service deduplicates by tenant/rule and records correlation', async () => {
  const pool = memoryPool();
  const service = createPersistentAlertService({ pool, now: () => new Date('2026-09-20T00:00:00Z') });
  const rule = { id: 'backlog', threshold: 300, escalationSeconds: 60, severity: 'high' };
  const first = await service.evaluate({ tenantId: 'tenant-a', rule, observed: 301, correlationId: 'trace-a' });
  const second = await service.evaluate({ tenantId: 'tenant-a', rule, observed: 999, correlationId: 'trace-b' });
  assert.equal(first.id, second.id);
  assert.equal(pool.rows.get('tenant-a:backlog').correlation_id, 'trace-a');
});

test('persistent alert acknowledgement refuses another tenant and recovery resolves the original alert', async () => {
  const pool = memoryPool();
  const service = createPersistentAlertService({ pool });
  const rule = { id: 'provider', threshold: 0, escalationSeconds: 60, severity: 'medium' };
  const alert = await service.evaluate({ tenantId: 'tenant-a', rule, observed: 1, correlationId: 'trace-a' });
  await assert.rejects(() => service.acknowledge({ tenantId: 'tenant-b', alertId: alert.id, actorId: 'user' }), /tenant/i);
  const resolved = await service.evaluate({ tenantId: 'tenant-a', rule, observed: 0, correlationId: 'trace-c' });
  assert.equal(resolved.status, 'resolved');
});
