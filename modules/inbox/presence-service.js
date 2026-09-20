function mapPresence(row) {
  return {
    tenantId: row.tenant_id,
    userId: row.user_id,
    teamId: row.team_id,
    sessionId: row.session_id,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
  };
}

async function heartbeatPresence(client, { tenantId, userId, teamId, sessionId, ttlMs = 30_000, now = new Date() }) {
  if (!tenantId || !userId || !teamId || !sessionId) throw new TypeError('tenantId, userId, teamId and sessionId are required');
  const expiresAt = new Date(now.getTime() + Math.max(1_000, Number(ttlMs) || 30_000));
  const result = await client.query(
    `insert into realtime_presence(tenant_id,user_id,team_id,session_id,last_seen_at,expires_at)
     values($1,$2,$3,$4,$5,$6)
     on conflict(tenant_id,user_id,team_id,session_id) do update
     set last_seen_at=excluded.last_seen_at,expires_at=excluded.expires_at
     returning *`,
    [tenantId, userId, teamId, sessionId, now, expiresAt],
  );
  return mapPresence(result.rows[0]);
}

async function listPresence(client, { tenantId, teamIds, now = new Date() }) {
  if (!tenantId || !Array.isArray(teamIds) || teamIds.length === 0) return [];
  const result = await client.query(
    `select * from realtime_presence
     where tenant_id=$1 and team_id=any($2::uuid[]) and expires_at>$3
     order by user_id,session_id`,
    [tenantId, teamIds, now],
  );
  return result.rows.map(mapPresence);
}

async function expirePresence(client, { now = new Date() } = {}) {
  const result = await client.query(
    `delete from realtime_presence where expires_at<=$1 returning *`,
    [now],
  );
  return result.rows.map(row => ({
    eventType: 'presence.changed',
    tenantId: row.tenant_id,
    audience: { teamIds: [row.team_id], capabilities: ['conversation:read'] },
    payload: { userId: row.user_id, sessionId: row.session_id, online: false },
  }));
}

module.exports = { expirePresence, heartbeatPresence, listPresence };
