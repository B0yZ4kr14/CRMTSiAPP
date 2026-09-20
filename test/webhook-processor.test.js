const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { DEFAULT_TENANT_ID } = require('../domain-schema');
const { processWebhookEvent } = require('../webhook-processor');

class DedupPool {
  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
  }
  async query(sql, values) {
    if (sql.includes('pg_advisory_xact_lock')) return { rows: [{}], rowCount: 1 };
    if (sql.includes('select id from conversation_messages')) {
      const [channelId, id] = values;
      const found = Array.from(this.messages.values()).find(m => m.provider_channel_id === channelId && m.provider_message_id === id);
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
      const [id, convId, body, channelId, provId] = values;
      const exists = Array.from(this.messages.values()).some(m => m.provider_channel_id === channelId && m.provider_message_id === provId);
      if (exists) return { rowCount: 0, rows: [] };
      this.messages.set(id, { id, conversation_id: convId, direction: 'inbound', body, provider_channel_id: channelId, provider_message_id: provId });
      return { rowCount: 1, rows: [{ id }] };
    }
    if (sql.includes('update conversations')) return { rowCount: 1 };
    if (sql.includes('insert into realtime_events')) {
      return { rowCount: 1, rows: [{
        sequence: 1, id: values[0], tenant_id: values[1], event_type: values[2],
        aggregate_type: values[3], aggregate_id: values[4], aggregate_version: values[5],
        payload: JSON.parse(values[6]), audience: JSON.parse(values[7]),
        occurred_at: new Date(), expires_at: values[9],
      }] };
    }
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
  }, { channelId: 'channel-test-1', tenantId: DEFAULT_TENANT_ID });
  
  assert.strictEqual(pool.conversations.size, 1, 'Deveria criar exatamente 1 conversa');
  assert.strictEqual(pool.messages.size, 1, 'Deveria criar exatamente 1 mensagem');
});

test('inbound processing claims channel-scoped provider identity inside the transaction before domain effects', async () => {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rowCount: 0, rows: [] };
      if (sql.includes('pg_advisory_xact_lock')) return { rowCount: 1, rows: [{}] };
      if (sql.includes('select id from conversation_messages')) return { rowCount: 1, rows: [{ id: 'existing' }] };
      throw new Error(`unexpected query after duplicate claim: ${sql}`);
    },
    release() {},
  };
  await processWebhookEvent({ connect: async () => client }, {
    type: 'message', providerEventId: 'same-id',
    message: { from: '5511999999999', text: { body: 'Olá' }, timestamp: '1700000000' },
  }, { channelId: '11111111-1111-1111-1111-111111111111', tenantId: DEFAULT_TENANT_ID });
  assert.equal(calls[0].sql, 'begin');
  assert.match(calls[1].sql, /pg_advisory_xact_lock/);
  assert.deepEqual(calls[2].values, ['11111111-1111-1111-1111-111111111111', 'same-id']);
  assert.equal(calls.at(-1).sql, 'rollback');
  assert.equal(calls.some(call => call.sql.includes('insert into conversations')), false);
});

test('inbound identity is scoped by channel so providers may reuse message ids', async () => {
  const seen = [];
  const pool = { async query(sql, values) {
    if (sql.includes('select id from conversation_messages')) {
      seen.push(values);
      return { rowCount: 1, rows: [{ id: 'existing' }] };
    }
    return { rowCount: 0, rows: [] };
  } };
  const event = { type: 'message', providerEventId: 'reused', message: { from: '1', text: { body: 'x' } } };
  await processWebhookEvent(pool, event, { channelId: 'channel-a', tenantId: DEFAULT_TENANT_ID });
  await processWebhookEvent(pool, event, { channelId: 'channel-b', tenantId: DEFAULT_TENANT_ID });
  assert.deepEqual(seen, [['channel-a', 'reused'], ['channel-b', 'reused']]);
});
