const crypto = require('crypto');

function stableEventId({ channelId, providerEventId, payload }) {
  if (providerEventId) return String(providerEventId);
  return crypto.createHash('sha256').update(`${channelId}:${JSON.stringify(payload)}`).digest('hex');
}

function createWebhookHandler({ pool, channelId = 'channel', verify = () => true, eventId, normalize = value => value }) {
  if (!pool || typeof pool.query !== 'function') throw new TypeError('pool.query is required');
  if (typeof verify !== 'function' || typeof eventId !== 'function' || typeof normalize !== 'function') throw new TypeError('webhook functions are required');
  return async (req, res) => {
    if (!verify(req)) return res.status(401).json({ error: 'invalid_signature' });
    let event;
    try { event = normalize(req.body, req); } catch { return res.status(400).json({ error: 'invalid_payload' }); }
    const providerEventId = stableEventId({ channelId, providerEventId: eventId(req.body, event), payload: req.body });
    const result = await pool.query(
      `insert into webhook_events(id,channel_id,provider_event_id,event_type,signature_valid,payload,status,available_at)
       values($1,$2,$3,$4,true,$5,'pending',now())
       on conflict(channel_id,provider_event_id) do nothing
       returning id`,
      [crypto.randomUUID(), channelId, providerEventId, String(event.type || 'unknown'), JSON.stringify(event)],
    );
    if (!result.rowCount) return res.status(200).json({ accepted: true, duplicate: true });
    return res.status(202).json({ accepted: true, duplicate: false, queued: true });
  };
}

module.exports = { createWebhookHandler, stableEventId };