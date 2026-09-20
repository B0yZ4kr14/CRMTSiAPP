const { processWebhookEvent } = require('./webhook-processor');

function nextRetryAt({ attempts, now = new Date(), baseMs = 1000, maxMs = 300000 }) {
  const delay = Math.min(maxMs, baseMs * (2 ** Math.max(0, attempts)));
  return new Date(now.getTime() + delay);
}

async function claimNextWebhook(pool, workerId) {
  const { rows } = await pool.query(`
    with next_event as (
      select id from webhook_events
      where (
        status in ('pending','failed') and available_at <= now() and attempts < max_attempts
      ) or (
        status='processing' and locked_at < now() - interval '2 minutes' and attempts < max_attempts
      )
      order by available_at, received_at
      for update skip locked limit 1
    )
    update webhook_events event
    set status='processing', locked_at=now(), locked_by=$1, lease_token=gen_random_uuid(), updated_at=now()
    from next_event where event.id=next_event.id
    returning event.*`, [workerId]);
  return rows[0] || null;
}

async function markWebhookProcessed(pool, event) {
  const result = await pool.query(`update webhook_events
    set status='processed', processed_at=now(), processing_error=null, locked_at=null, locked_by=null, lease_token=null, updated_at=now()
    where id=$1 and status='processing' and locked_by=$2 and lease_token=$3`, [event.id, event.locked_by, event.lease_token]);
  return result.rowCount === 1;
}

async function markWebhookFailed(pool, event, error) {
  const attempts = Number(event.attempts) + 1;
  const dead = attempts >= Number(event.max_attempts);
  const status = dead ? 'dead_letter' : 'failed';
  const result = await pool.query(`update webhook_events
    set status=$4, attempts=$5, available_at=$6, processing_error=$7, locked_at=null, locked_by=null, lease_token=null, updated_at=now()
    where id=$1 and status='processing' and locked_by=$2 and lease_token=$3`, [
    event.id,
    event.locked_by,
    event.lease_token,
    status,
    attempts,
    nextRetryAt({ attempts }),
    String(error?.message || error || 'webhook processing failure').slice(0, 1000),
  ]);
  return { accepted: result.rowCount === 1, dead };
}

async function processOneWebhook({ pool, workerId, processEvent = processWebhookEvent }) {
  const event = await claimNextWebhook(pool, workerId);
  if (!event) return null;
  try {
    await processEvent(pool, event.payload, { channelId: event.channel_id, tenantId: event.tenant_id });
    const accepted = await markWebhookProcessed(pool, event);
    return { id: event.id, status: accepted ? 'processed' : 'lease_lost' };
  } catch (error) {
    const outcome = await markWebhookFailed(pool, event, error);
    return { id: event.id, status: outcome.accepted ? (outcome.dead ? 'dead_letter' : 'retrying') : 'lease_lost' };
  }
}

module.exports = { claimNextWebhook, markWebhookFailed, markWebhookProcessed, nextRetryAt, processOneWebhook };
