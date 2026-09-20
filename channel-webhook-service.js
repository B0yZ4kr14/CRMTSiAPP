const crypto = require('crypto');
const { verifyMetaSignature } = require('./channel-adapter');

function header(headers, name) {
  if (!headers) return undefined;
  const wanted = name.toLowerCase();
  return Object.entries(headers).find(([key]) => key.toLowerCase() === wanted)?.[1];
}

function validWahaSignature({ rawBody, headers, webhookSecret }) {
  const algorithm = String(header(headers, 'x-webhook-hmac-algorithm') || '').toLowerCase();
  const signature = String(header(headers, 'x-webhook-hmac') || '').trim();
  if (!webhookSecret || algorithm !== 'sha512' || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha512', webhookSecret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

function wahaEvents(payload, config = {}) {
  if (payload?.event !== 'message' || payload?.payload?.fromMe || (config.sessionName && payload.session !== config.sessionName)) return [];
  const message = payload.payload;
  const providerEventId = String(message.id || '');
  const phone = String(message.from || '').replace(/@c\.us$/i, '');
  if (!providerEventId || !phone) return [];
  return [{
    type: 'message',
    providerEventId,
    message: { id: providerEventId, from: phone, text: { body: String(message.body || '') }, timestamp: String(message.timestamp || '') },
    contacts: [{ wa_id: phone, profile: { name: String(message.pushName || phone) } }],
  }];
}

function metaEvents(payload) {
  const events = [];
  for (const entry of payload?.entry || []) for (const change of entry?.changes || []) {
    const value = change?.value || {};
    for (const message of value.messages || []) events.push({ type: 'message', providerEventId: message.id, message, contacts: value.contacts || [] });
    for (const status of value.statuses || []) events.push({ type: 'delivery', providerEventId: `${status.id}:${status.status}:${status.timestamp || ''}`, status });
  }
  return events;
}

function createChannelWebhookService({ pool, loadChannel }) {
  if (typeof loadChannel !== 'function') throw new TypeError('loadChannel is required');
  async function channel(id) {
    const value = await loadChannel(id);
    if (!value?.provider) throw new Error('channel not found');
    return value;
  }
  return {
    async verify(req, res, channelId) {
      const value = await channel(channelId);
      const query = req.query || {};
      if (value.provider !== 'meta' || query['hub.mode'] !== 'subscribe' || query['hub.verify_token'] !== value.credentials?.verifyToken) return res.status(403).send('forbidden');
      return res.status(200).send(String(query['hub.challenge'] || ''));
    },
    async receive(req, res, channelId) {
      const value = await channel(channelId);
      const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}));
      const isMeta = value.provider === 'meta';
      const isWaha = value.provider === 'waha';
      if (!isMeta && !isWaha) return res.status(400).json({ error: 'unsupported_provider' });
      const authentic = isMeta
        ? verifyMetaSignature({ rawBody, signature: header(req.headers, 'x-hub-signature-256'), appSecret: value.credentials?.appSecret })
        : validWahaSignature({ rawBody, headers: req.headers, webhookSecret: value.credentials?.apiKey || value.credentials?.webhookToken });
      if (!authentic) return res.status(401).json({ error: 'invalid_signature' });
      const events = isMeta ? metaEvents(req.body) : wahaEvents(req.body, value.config);
      if (!events.length) return res.status(200).json({ accepted: true, ignored: true });
      let accepted = 0;
      let duplicates = 0;
      for (const event of events) {
        const result = await pool.query(
          `insert into webhook_events(id,channel_id,tenant_id,provider_event_id,event_type,signature_valid,payload,status,available_at)
           values($1,$2,$3,$4,$5,true,$6,'pending',now())
           on conflict(channel_id,provider_event_id) do nothing
           returning id`,
          [crypto.randomUUID(), channelId, value.tenant_id, event.providerEventId, event.type, JSON.stringify(event)],
        );
        if (!result.rowCount) { duplicates += 1; continue; }
        accepted += 1;
      }
      return res.status(accepted ? 202 : 200).json({ accepted: true, duplicate: accepted === 0, received: events.length, duplicates });
    },
  };
}

module.exports = { createChannelWebhookService, metaEvents, wahaEvents, validWahaSignature };