const crypto = require('crypto');
const { appendEvent } = require('./modules/realtime/event-store');

function realtimeEvent(event) {
  return { ...event, id: crypto.randomUUID() };
}

async function emitRealtime(client, event) {
  return appendEvent(client, realtimeEvent(event));
}

function epochToDate(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date();
}

function incomingBody(message) {
  if (message?.type === 'text' || message?.text?.body) return String(message.text?.body || '');
  if (message?.type === 'button') return String(message.button?.text || '');
  if (message?.type === 'interactive') return String(message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '');
  return `[${String(message?.type || 'mensagem')} recebida]`;
}

async function processInbound(pool, event, { channelId, tenantId }) {
  if (!tenantId) throw new Error('tenant context is required for inbound processing');
  const message = event.message;
  const phone = String(message.from || '');
  const name = String(event.contacts?.find(contact => contact.wa_id === phone)?.profile?.name || phone || 'Contato');
  const timestamp = epochToDate(message.timestamp);

  const client = typeof pool.connect === 'function' ? await pool.connect() : null;
  const executor = client || pool;

  try {
    if (client) await client.query('begin');

    await executor.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [`${channelId}:${event.providerEventId}`]);
    const duplicate = await executor.query(
      'select id from conversation_messages where provider_channel_id=$1 and provider_message_id=$2 limit 1',
      [channelId, event.providerEventId]
    );
    if (duplicate.rowCount) {
      if (client) await client.query('rollback');
      return;
    }

    let found = await executor.query(
      `select id from conversations where tenant_id=$1 and channel=$2 and contact_phone=$3 and status='open' order by updated_at desc limit 1 for update`,
      [tenantId, channelId, phone]
    );

    let conversationId;
    if (found.rowCount > 0) {
      conversationId = found.rows[0].id;
    } else {
      conversationId = crypto.randomUUID();
      await executor.query(
        `insert into conversations(id,tenant_id,contact_name,contact_phone,status,channel,last_message_at,last_inbound_at) values($1,$2,$3,$4,'open',$5,$6,$6)`,
        [conversationId, tenantId, name, phone, channelId, timestamp]
      );
    }

    const messageId = crypto.randomUUID();
    await executor.query(
      `insert into conversation_messages(id,tenant_id,conversation_id,direction,body,provider_channel_id,provider_message_id,created_at)
       values($1,$2,$3,'inbound',$4,$5,$6,$7)`,
      [messageId, tenantId, conversationId, incomingBody(message), channelId, event.providerEventId, timestamp]
    );
    await executor.query(
      `update conversations set last_message_at=$1, last_inbound_at=$1, updated_at=now() where id=$2`,
      [timestamp, conversationId]
    );
    await emitRealtime(executor, {
      tenantId, eventType: 'inbox.message.created',
      aggregateType: 'conversation', aggregateId: conversationId,
      aggregateVersion: Math.max(0, timestamp.getTime()),
      payload: { eventId: messageId, messageId, conversationId, direction: 'inbound', occurredAt: timestamp.toISOString() },
      audience: { capabilities: ['conversation:read'] },
    });

    if (client) await client.query('commit');
  } catch (error) {
    if (client) await client.query('rollback');
    throw error;
  } finally {
    if (client) client.release();
  }
}

async function processDelivery(pool, event, { channelId, tenantId }) {
  if (!tenantId) throw new Error('tenant context is required for delivery processing');
  const status = event.status;
  const normalized = ['sent', 'delivered', 'read', 'failed'].includes(status.status) ? status.status : 'failed';
  const occurredAt = epochToDate(status.timestamp);

  await pool.query(`update conversation_messages set delivery_status=$1 where tenant_id=$3 and provider_message_id=$2`, [normalized, status.id, tenantId]);
  await pool.query(
    `insert into delivery_events(id,tenant_id,channel_id,message_id,provider_message_id,status,occurred_at,payload)
     values($1,$2,$3,(select id from conversation_messages where tenant_id=$2 and provider_message_id=$4 limit 1),$4,$5,$6,$7)
     on conflict(channel_id,provider_message_id,status) do nothing`,
    [crypto.randomUUID(), tenantId, channelId, status.id, normalized, occurredAt, JSON.stringify(event)]
  );
}

async function processWebhookEvent(pool, event, context) {
  if (event.type === 'message') return processInbound(pool, event, context);
  if (event.type === 'delivery') return processDelivery(pool, event, context);
}

module.exports = { incomingBody, processWebhookEvent };
