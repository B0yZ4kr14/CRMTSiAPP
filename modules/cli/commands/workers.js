async function listWorkers({ pool, tenantId = null, staleAfterMs = 60000 }) {
  const values = [];
  const clauses = [];
  if (tenantId) {
    values.push(tenantId);
    clauses.push(`tenant_id=$${values.length}`);
  }
  const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
  const result = await pool.query(`
    select worker_id,tenant_id,last_heartbeat_at,claims_paused,updated_at
    from worker_heartbeats ${where}
    order by tenant_id,worker_id
  `, values);
  const now = Date.now();
  return result.rows.map(row => ({
    workerId: row.worker_id,
    tenantId: row.tenant_id,
    lastHeartbeatAt: row.last_heartbeat_at,
    stale: !row.last_heartbeat_at || now - new Date(row.last_heartbeat_at).getTime() > staleAfterMs,
    claimsPaused: Boolean(row.claims_paused),
  }));
}

module.exports = { listWorkers };