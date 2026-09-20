const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;

function mapRow(row) {
  return {
    sequence: Number(row.sequence),
    id: row.id,
    tenantId: row.tenant_id,
    eventType: row.event_type,
    aggregate: {
      type: row.aggregate_type,
      id: row.aggregate_id,
      version: Number(row.aggregate_version),
    },
    payload: row.payload,
    audience: row.audience,
    occurredAt: row.occurred_at,
    expiresAt: row.expires_at,
  };
}

async function appendEvent(client, event, options = {}) {
  const expiresAt = event.expiresAt || new Date(Date.now() + (options.retentionMs || DEFAULT_RETENTION_MS));
  const result = await client.query(
    `insert into realtime_events(
       id,tenant_id,event_type,aggregate_type,aggregate_id,aggregate_version,payload,audience,occurred_at,expires_at
     ) values($1,$2,$3,$4,$5,$6,$7,$8,coalesce($9,now()),$10)
     returning *`,
    [event.id, event.tenantId, event.eventType, event.aggregateType, event.aggregateId,
      event.aggregateVersion, JSON.stringify(event.payload), JSON.stringify(event.audience || {}),
      event.occurredAt || null, expiresAt],
  );
  return mapRow(result.rows[0]);
}

async function currentSequence(client, tenantId) {
  const result = await client.query(
    'select coalesce(max(sequence),0)::text as sequence from realtime_events where tenant_id=$1',
    [tenantId],
  );
  return Number(result.rows?.[0]?.sequence || 0);
}

async function replayEvents(client, { tenantId, cursor = 0, limit = 100, audience, expand = false }) {
  const requestedLimit = Math.max(1, Number(limit) || 100);
  const boundedLimit = Math.min(requestedLimit, expand ? 10_000 : 1000);
  const currentCursor = await currentSequence(client, tenantId);
  const expired = await client.query(
    `select 1 from realtime_events
     where tenant_id=$1 and sequence>$2 and expires_at<=now() limit 1`,
    [tenantId, cursor],
  );
  if (expired.rowCount > 0) return { cursorExpired: true, currentCursor, events: [] };

  const result = await client.query(
    `select * from realtime_events
     where tenant_id=$1 and sequence>$2 and expires_at>now()
     order by sequence asc limit $3`,
    [tenantId, cursor, boundedLimit],
  );
  const events = result.rows.map(mapRow).filter(event => {
    if (!audience) return true;
    const requiredTeams = Array.isArray(event.audience?.teamIds) ? event.audience.teamIds : [];
    const requiredCapabilities = Array.isArray(event.audience?.capabilities) ? event.audience.capabilities : [];
    const teams = new Set(audience.teamIds || []);
    const capabilities = new Set(audience.capabilities || []);
    return requiredTeams.every(teamId => teams.has(teamId))
      && requiredCapabilities.every(capability => capabilities.has('*') || capabilities.has(capability));
  });
  return { cursorExpired: false, currentCursor, events };
}

async function pruneExpiredEvents(client, { tenantId, before = new Date() }) {
  const result = await client.query(
    'delete from realtime_events where tenant_id=$1 and expires_at<=$2',
    [tenantId, before],
  );
  return result.rowCount;
}

module.exports = { appendEvent, currentSequence, pruneExpiredEvents, replayEvents };
