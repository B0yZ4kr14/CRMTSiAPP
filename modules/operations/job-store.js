const crypto = require('node:crypto');

function createJobEnvelope({ tenantId, kind, payload, idempotencyKey, maxAttempts = 8 }) {
  return {
    id: crypto.randomUUID(),
    tenantId,
    kind,
    payload: payload || {},
    idempotencyKey: idempotencyKey || crypto.randomUUID(),
    status: 'queued',
    maxAttempts,
    attempts: 0,
    createdAt: new Date()
  };
}

async function enqueueJob(pool, { tenantId, kind, payload, idempotencyKey, maxAttempts = 8 }) {
  const result = await pool.query(
    `insert into outbox_jobs (id, tenant_id, kind, payload, idempotency_key, max_attempts, status, available_at)
     values (gen_random_uuid(), $1, $2, $3, $4, $5, 'queued', now())
     on conflict (idempotency_key) do update set payload = excluded.payload
     returning id, status`,
    [tenantId, kind, JSON.stringify(payload), idempotencyKey, maxAttempts]
  );
  return result.rows[0];
}

async function claimNextJob(pool, workerId) {
  const { rows } = await pool.query(
    `with next_job as (
      select id from outbox_jobs
      where status in ('queued', 'failed') and available_at <= now() and attempts < max_attempts
      order by available_at, created_at
      for update skip locked limit 1
    )
    update outbox_jobs job
    set status = 'processing', locked_at = now(), locked_by = $1, lease_token = gen_random_uuid(), attempts = attempts + 1, updated_at = now()
    from next_job where job.id = next_job.id
    returning job.*`,
    [workerId]
  );
  return rows[0] || null;
}

async function pauseClaims(pool, tenantId) {
  await pool.query(
    `insert into queue_controls(tenant_id,claims_paused,updated_at)
     values($1,true,now())
     on conflict(tenant_id) do update set claims_paused=true,updated_at=now()`,
    [tenantId],
  );
  return { paused: true };
}

async function resumeClaims(pool, tenantId) {
  await pool.query(
    `insert into queue_controls(tenant_id,claims_paused,updated_at)
     values($1,false,now())
     on conflict(tenant_id) do update set claims_paused=false,updated_at=now()`,
    [tenantId],
  );
  return { paused: false };
}

async function drainQueue(pool, tenantId, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const startedAt = Date.now();
  await pauseClaims(pool, tenantId);
  try {
    while (Date.now() - startedAt < timeoutMs) {
      const active = await pool.query(
        `select count(*)::int as count from outbox_jobs
         where tenant_id=$1 and status in ('processing','sending')`,
        [tenantId],
      );
      if (active.rows[0].count === 0) {
        return { drained: true, elapsedMs: Date.now() - startedAt };
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(250, timeoutMs)));
    }
    const error = new Error('OPERATION_TIMEOUT');
    error.code = 'OPERATION_TIMEOUT';
    throw error;
  } finally {
    await resumeClaims(pool, tenantId);
  }
}

module.exports = { createJobEnvelope, enqueueJob, claimNextJob, pauseClaims, resumeClaims, drainQueue };