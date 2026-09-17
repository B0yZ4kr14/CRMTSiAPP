const crypto = require('crypto');

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

async function processInbound(pool, event, { channelId }) {
  const message = event.message;
  const phone = String(message.from || '');
  const name = String(event.contacts?.find(contact => contact.wa_id === phone)?.profile?.name || phone || 'Contato');
  const timestamp = epochToDate(message.timestamp);

  // Verificação de unicidade da mensagem como primeira ação (sem transação complexa no início)
  if (event.providerEventId) {
    const existingMsg = await pool.query(`select id from conversation_messages where provider_message_id=$1 limit 1`, [event.providerEventId]);
    if (existingMsg.rowCount > 0) return;
  }

  const client = typeof pool.connect === 'function' ? await pool.connect() : null;
  const executor = client || pool;

  try {
    if (client) await client.query('begin');

    // 1. Encontrar ou criar conversa de forma atômica
    // Usamos um select para obter a conversa ou criá-la.
    let found = await executor.query(
      `select id from conversations where channel=$1 and contact_phone=$2 and status='open' order by updated_at desc limit 1 for update`,
      [channelId, phone]
    );
    
    let conversationId;
    if (found.rowCount > 0) {
      conversationId = found.rows[0].id;
    } else {
      conversationId = crypto.randomUUID();
      await executor.query(
        `insert into conversations(id,contact_name,contact_phone,status,channel,last_message_at,last_inbound_at) values($1,$2,$3,'open',$4,$5,$5)`,
        [conversationId, name, phone, channelId, timestamp]
      );
    }

    // 2. Inserir a mensagem com conflito em provider_message_id
    const msgId = crypto.randomUUID();
    const msgResult = await executor.query(
      `insert into conversation_messages(id,conversation_id,direction,body,provider_message_id,created_at) values($1,$2,$3,$4,$5,$6) on conflict (provider_message_id) do nothing returning id`,
      [msgId, conversationId, 'inbound', incomingBody(message), event.providerEventId, timestamp]
    );

    // Se a mensagem foi inserida (rowCount 1), atualiza o timestamp da conversa
    if (msgResult.rowCount > 0) {
      await executor.query(
        `update conversations set last_message_at=$1, last_inbound_at=$1, updated_at=now() where id=$2`,
        [timestamp, conversationId]
      );
    }

    if (client) await client.query('commit');
  } catch (error) {
    if (client) await client.query('rollback');
    throw error;
  } finally {
    if (client) client.release();
  }
}

async function processDelivery(pool, event, { channelId }) {
  const status = event.status;
  const normalized = ['sent', 'delivered', 'read', 'failed'].includes(status.status) ? status.status : 'failed';
  const occurredAt = epochToDate(status.timestamp);
  
  await pool.query(`update conversation_messages set delivery_status=$1 where provider_message_id=$2`, [normalized, status.id]);
  await pool.query(
    `insert into delivery_events(id,channel_id,message_id,provider_message_id,status,occurred_at,payload) 
     values($1,$2,(select id from conversation_messages where provider_message_id=$3 limit 1),$3,$4,$5,$6) 
     on conflict(channel_id,provider_message_id,status) do nothing`,
    [crypto.randomUUID(), channelId, status.id, normalized, occurredAt, JSON.stringify(event)]
  );
}

async function processWebhookEvent(pool, event, context) {
  if (event.type === 'message') return processInbound(pool, event, context);
  if (event.type === 'delivery') return processDelivery(pool, event, context);
}

module.exports = { incomingBody, processWebhookEvent };
