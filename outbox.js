const crypto = require('crypto');

function nextRetryAt({ attempts, now = new Date(), baseMs = 1000, maxMs = 300000 }) {
  const delay = Math.min(maxMs, baseMs * (2 ** Math.max(0, attempts)));
  return new Date(now.getTime() + delay);
}

function classifyFailure(error) {
  const status = Number(error?.status || error?.statusCode);
  const reason = status ? `provider HTTP ${status}` : String(error?.message || error || 'unknown delivery failure');
  return { terminal: status >= 400 && status < 500 && status !== 408 && status !== 409 && status !== 425 && status !== 429, reason: reason.slice(0, 1000) };
}

async function claimNextJob(pool, workerId) {
  const leaseToken = crypto.randomUUID();
  const { rows } = await pool.query(`
    with ambiguous as (
      update outbox_jobs set status='delivery_unknown', last_error='delivery outcome unknown after lease expiry', locked_at=null, locked_by=null, lease_token=null, updated_at=now()
      where status='processing' and locked_at < now() - interval '2 minutes'
    ), next_job as (
      select id from outbox_jobs
      where status in ('pending','failed') and available_at <= now() and attempts < max_attempts
      order by available_at, created_at
      for update skip locked limit 1
    )
    update outbox_jobs job set status='processing', locked_at=now(), locked_by=$1, lease_token=$2, updated_at=now()
    from next_job where job.id=next_job.id returning job.*`, [workerId, leaseToken]);
  return rows[0] || null;
}

async function markDelivered(pool, job, result) {
  const response = await pool.query(`
    with accepted as (
      update outbox_jobs
      set status='sent', provider_message_id=$2, locked_at=null, locked_by=null, lease_token=null, updated_at=now()
      where id=$1 and status='processing' and locked_by=$3 and lease_token=$4
      returning idempotency_key
    )
    update conversation_messages
    set provider_message_id=$2, delivery_status='sent'
    where id = (select idempotency_key from accepted)
  `, [job.id, result.providerMessageId, job.locked_by, job.lease_token]);
  return response.rowCount > 0;
}

async function markFailed(pool, job, error) {
  const failure = classifyFailure(error);
  const attempts = Number(job.attempts) + 1;
  const dead = failure.terminal || attempts >= Number(job.max_attempts);
  if (dead) {
    await pool.query(`
      with failed as (
        update outbox_jobs
        set status='dead_letter', attempts=$2, last_error=$3, locked_at=null, locked_by=null, lease_token=null, updated_at=now()
        where id=$1 and status='processing' and locked_by=$5 and lease_token=$6
        returning id, idempotency_key, payload
      ), linked_message as (
        update conversation_messages
        set delivery_status='failed'
        where id = (select idempotency_key from failed)
      )
      insert into failed_jobs(id,outbox_job_id,reason,payload)
      select $4, id, $3, payload from failed
      on conflict(outbox_job_id) do nothing
    `, [job.id, attempts, failure.reason, crypto.randomUUID(), job.locked_by, job.lease_token]);
    return { dead: true };
  }
  const retryAt = nextRetryAt({ attempts });
  await pool.query(`update outbox_jobs set status='failed', attempts=$2, available_at=$3, last_error=$4, locked_at=null, locked_by=null, lease_token=null, updated_at=now() where id=$1 and status='processing' and locked_by=$5 and lease_token=$6`, [job.id, attempts, retryAt, failure.reason, job.locked_by, job.lease_token]);
  return { dead: false, retryAt };
}

async function enqueue(pool, { id = crypto.randomUUID(), channelId = null, conversationId = null, kind, payload = {}, idempotencyKey = id, maxAttempts = 8 }) {
  if (!['text', 'template'].includes(kind)) throw new Error('unsupported outbox kind');
  const { rows } = await pool.query(`insert into outbox_jobs(id,channel_id,conversation_id,kind,payload,idempotency_key,max_attempts)
    values($1,$2,$3,$4,$5,$6,$7)
    on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
    returning id,status`, [id, channelId, conversationId, kind, JSON.stringify(payload), idempotencyKey, maxAttempts]);
  return rows[0];
}

module.exports = { claimNextJob, classifyFailure, enqueue, markDelivered, markFailed, nextRetryAt };