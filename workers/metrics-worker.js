const { summarizeMetrics } = require('../modules/reporting/metric-service');

async function rollupMetrics(pool, options) {
  const { rows } = await pool.query(
    `select id,tenant_id,occurred_at,type,duration_ms,channel,queue
       from metric_events
      where tenant_id=$1 and occurred_at >= $2 and occurred_at < $3
      order by occurred_at asc,id asc`,
    [options.tenantId, options.from, options.to],
  );
  return summarizeMetrics(rows.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    occurredAt: row.occurred_at,
    type: row.type,
    durationMs: row.duration_ms === null ? undefined : Number(row.duration_ms),
    channel: row.channel,
    queue: row.queue,
  })), options);
}

module.exports = { rollupMetrics };
