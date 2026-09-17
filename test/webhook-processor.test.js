const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { processWebhookEvent } = require('../webhook-processor');

class DedupPool {
  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
  }
  async query(sql, values) {
    if (sql.includes('select id from conversation_messages')) {
      const id = values[0];
      const found = Array.from(this.messages.values()).find(m => m.provider_message_id === id);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    if (sql.includes('select id from conversations')) {
      const channel = values[0];
      const phone = values[1];
      const found = Array.from(this.conversations.values()).find(c => c.channel === channel && c.contact_phone === phone);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    if (sql.includes('insert into conversations')) {
      const [id, name, phone, channel] = [values[0], values[1], values[2], values[4]];
      this.conversations.set(id, { id, contact_name: name, contact_phone: phone, channel });
      return { rowCount: 1, rows: [{ id }] };
    }
    if (sql.includes('insert into conversation_messages')) {
      const [id, convId, direction, body, provId] = values;
      const exists = Array.from(this.messages.values()).some(m => m.provider_message_id === provId);
      if (exists) return { rowCount: 0, rows: [] };
      this.messages.set(id, { id, conversation_id: convId, direction, body, provider_message_id: provId });
      return { rowCount: 1, rows: [{ id }] };
    }
    if (sql.includes('update conversations')) return { rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }
}

test('P1-01: webhook deduplication - first inbound creates conversation and message', async () => {
  const pool = new DedupPool();
  await processWebhookEvent(pool, {
    type: 'message',
    providerEventId: 'wamid.dedup-001',
    message: { from: '5511999999999', text: { body: 'Olá' }, timestamp: '1700000000' },
    contacts: [{ wa_id: '5511999999999', profile: { name: 'Maria' } }]
  }, { channelId: 'channel-test-1' });
  
  assert.strictEqual(pool.conversations.size, 1, 'Deveria criar exatamente 1 conversa');
  assert.strictEqual(pool.messages.size, 1, 'Deveria criar exatamente 1 mensagem');
});

test('P1-01: webhook deduplication - same providerEventId is rejected/deduplicated', async () => {
  const pool = new DedupPool();
  
  await processWebhookEvent(pool, {
    type: 'message',
    providerEventId: 'wamid.dedup-001',
    message: { from: '5511999999999', text: { body: 'Olá' }, timestamp: '1700000000' },
    contacts: [{ wa_id: '5511999999999', profile: { name: 'Maria' } }]
  }, { channelId: 'channel-test-1' });
  
  const initialConv = pool.conversations.size;
  const initialMsg = pool.messages.size;
  
  await processWebhookEvent(pool, {
    type: 'message',
    providerEventId: 'wamid.dedup-001',
    message: { from: '5511999999999', text: { body: 'Duplicado' }, timestamp: '1700000001' },
    contacts: [{ wa_id: '5511999999999', profile: { name: 'Maria' } }]
  }, { channelId: 'channel-test-1' });
  
  assert.strictEqual(pool.conversations.size, initialConv, 'Não deveria criar nova conversa para providerEventId duplicado');
  assert.strictEqual(pool.messages.size, initialMsg, 'Não deveria criar nova mensagem para providerEventId duplicado');
});
