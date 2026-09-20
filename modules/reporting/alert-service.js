const crypto = require('node:crypto');

function createAlertService({ now = () => new Date() } = {}) {
  const alerts = new Map();
  const keyFor = (tenantId, ruleId) => `${tenantId}:${ruleId}`;

  function evaluate({ tenantId, rule, observed }) {
    const key = keyFor(tenantId, rule.id);
    const existing = alerts.get(key);
    if (Number(observed) <= Number(rule.threshold)) {
      if (!existing) return Object.freeze({ id: null, tenantId, ruleId: rule.id, status: 'resolved' });
      const resolved = Object.freeze({ ...existing, status: 'resolved', resolvedAt: now().toISOString() });
      alerts.set(key, resolved);
      return resolved;
    }
    if (existing && ['open', 'acknowledged', 'escalated'].includes(existing.status)) return existing;
    const created = Object.freeze({
      id: crypto.randomUUID(), tenantId, ruleId: rule.id, severity: rule.severity || 'medium', observed: Number(observed),
      status: 'open', openedAt: now().toISOString(), escalationDueAt: new Date(now().getTime() + Number(rule.escalationSeconds || 0) * 1000).toISOString(), acknowledgedBy: null,
    });
    alerts.set(key, created);
    return created;
  }

  function acknowledge({ tenantId, alertId, actorId }) {
    const match = [...alerts.entries()].find(([, alert]) => alert.id === alertId);
    if (!match || match[1].tenantId !== tenantId) throw new Error('alert does not belong to tenant');
    const [key, alert] = match;
    const acknowledged = Object.freeze({ ...alert, status: 'acknowledged', acknowledgedBy: String(actorId), acknowledgedAt: now().toISOString() });
    alerts.set(key, acknowledged);
    return acknowledged;
  }

  function escalateDue(at = now()) {
    const due = [];
    for (const [key, alert] of alerts) {
      if (alert.status === 'open' && new Date(alert.escalationDueAt) <= at) {
        const escalated = Object.freeze({ ...alert, status: 'escalated', escalatedAt: at.toISOString() });
        alerts.set(key, escalated);
        due.push(escalated);
      }
    }
    return due;
  }

  return Object.freeze({ evaluate, acknowledge, escalateDue });
}


function createPersistentAlertService({ pool, now = () => new Date() } = {}) {
  if (!pool || typeof pool.query !== 'function') throw new TypeError('pool is required');

  async function evaluate({ tenantId, rule, observed, correlationId = null }) {
    const existing = await pool.query(
      `select id,tenant_id,rule_id,severity,status,observed_value,escalation_due_at,correlation_id,acknowledged_by
         from alert_instances where tenant_id=$1 and rule_id=$2 and status in ('open','acknowledged','escalated') order by opened_at desc limit 1`,
      [tenantId, rule.id],
    );
    if (Number(observed) <= Number(rule.threshold)) {
      if (!existing.rowCount) return Object.freeze({ id: null, tenantId, ruleId: rule.id, status: 'resolved' });
      const row = existing.rows[0];
      const resolved = await pool.query(`update alert_instances set status='resolved',resolved_at=$3 where tenant_id=$1 and rule_id=$2 and status in ('open','acknowledged','escalated') returning id,tenant_id,rule_id,status,acknowledged_by`, [tenantId, rule.id, now().toISOString()]);
      return Object.freeze({ id: row.id, tenantId, ruleId: rule.id, status: resolved.rows[0]?.status || 'resolved', acknowledgedBy: row.acknowledged_by || null });
    }
    if (existing.rowCount) {
      const row = existing.rows[0];
      return Object.freeze({ id: row.id, tenantId, ruleId: rule.id, status: row.status, acknowledgedBy: row.acknowledged_by || null });
    }
    const id = crypto.randomUUID();
    const dueAt = new Date(now().getTime() + Number(rule.escalationSeconds || 0) * 1000).toISOString();
    const inserted = await pool.query(
      `insert into alert_instances(id,tenant_id,rule_id,severity,status,observed_value,escalation_due_at,correlation_id)
       values($1,$2,$3,$4,$5,$6,$7,$8) returning id,tenant_id,rule_id,severity,status,observed_value,escalation_due_at,correlation_id,acknowledged_by`,
      [id, tenantId, rule.id, rule.severity || 'medium', 'open', Number(observed), dueAt, correlationId],
    );
    const row = inserted.rows[0];
    return Object.freeze({ id: row.id, tenantId, ruleId: rule.id, status: row.status, correlationId: row.correlation_id });
  }

  async function acknowledge({ tenantId, alertId, actorId }) {
    const found = await pool.query(`select id,tenant_id,rule_id,status from alert_instances where id=$1 and tenant_id=$2`, [alertId, tenantId]);
    if (!found.rowCount) throw new Error('alert does not belong to tenant');
    const updated = await pool.query(`update alert_instances set status='acknowledged',acknowledged_by=$3,acknowledged_at=now() where id=$1 and tenant_id=$2 returning id,tenant_id,rule_id,status,acknowledged_by`, [alertId, tenantId, actorId]);
    const row = updated.rows[0];
    return Object.freeze({ id: row.id, tenantId, ruleId: row.rule_id, status: row.status, acknowledgedBy: row.acknowledged_by });
  }

  return Object.freeze({ evaluate, acknowledge });
}

module.exports = { createAlertService, createPersistentAlertService };
