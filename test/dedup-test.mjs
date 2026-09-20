import { processWebhookEvent } from '../webhook-processor.js';

// Simple mock pool tracking what SQL was called and in what order
class MockPool {
  constructor() {
    this.calls = [];
    this.conversations = new Map(); // Map of conversationId -> {contact_phone, channel}
    this.messages = new Map(); // Map of messageId -> data
  }
  
  async query(sql, values) {
    if (sql.includes('pg_advisory_xact_lock')) return { rows: [{}], rowCount: 1 };
    // Simulate channel-scoped provider identity check
    if (sql.includes('select id from conversation_messages') && values) {
      const [channelId, providerEventId] = values;
      for (const [msgId, msgData] of this.messages.entries()) {
        if (msgData.provider_channel_id === channelId && msgData.provider_message_id === providerEventId) {
          return { rows: [{ id: msgId }], rowCount: 1 };
        }
      }
      return { rows: [], rowCount: 0 };
    }
    
    // Simulate select id from conversations
    if (sql.includes('select id from conversations') && values) {
      const [channelId, phone] = values;
      // Check if already exists
      for (const [convId, convData] of this.conversations.entries()) {
        if (convData.contact_phone === String(phone) && convData.channel === String(channelId)) {
          return { rows: [{ id: convId }] };
        }
      }
      return { rows: [] };
    }

    // Simulate insert into conversations
    if (sql.includes('insert into conversations')) {
      const [id, , phone, channel] = values;
      this.conversations.set(id, { id, contact_phone: String(phone), channel: String(channel) });
      return { rowCount: 1, rows: [{ id }] };
    }

    // Simulate insert into conversation_messages
    if (sql.includes('insert into conversation_messages') && values) {
      const msgId = values[0];
      const channelId = values[3];
      const providerMsgId = values[4];

      // Check channel-scoped conflict scenario
      if (providerMsgId) {
        for (const existingData of this.messages.values()) {
          if (existingData.provider_channel_id === channelId && existingData.provider_message_id === providerMsgId) {
            return { rowCount: 0 };
          }
        }
      }

      this.messages.set(msgId, {
        provider_channel_id: channelId,
        provider_message_id: providerMsgId,
        conversation_id: values[1]
      });
      return { rowCount: 1 };
    }
    
    // Simulate update conversations
    if (sql.includes('update conversations set last_message_at=$1')) {
      return { rowCount: 1 };
    }
    
    // Default
    return { rows: [], rowCount: 0 };
  }
}

async function main() {
  console.log('=== P1-01 Test: Webhook Processing Deduplication ===\n');
  
  console.log('Test 1: First inbound webhook event');
  const pool1 = new MockPool();
  const event1 = {
    type: 'message',
    providerEventId: 'wamid.inbound-test-001',
    message: { 
      id: 'msg.inbound-001', 
      from: '5511999999999', 
      text: { body: 'Olá, como vai?' }, 
      timestamp: '1700000000' 
    },
    contacts: [{ wa_id: '5511999999999', profile: { name: 'Maria' } }]
  };
  
  await processWebhookEvent(pool1, event1, { channelId: 'channel-001' });
  let passed = pool1.conversations.size === 1 && pool1.messages.size === 1;
  console.log(`  ${passed ? 'PASS' : 'FAIL'}: First event should create exactly 1 conversation and 1 message\n`);
  if (!passed) process.exitCode = 1;
  
  console.log('Test 2: Same providerEventId should be deduplicated (P1-01)');
  const pool2 = new MockPool();
  await processWebhookEvent(pool2, event1, { channelId: 'channel-001' });
  await processWebhookEvent(pool2, event1, { channelId: 'channel-001' }); // repeat
  
  passed = pool2.conversations.size === 1 && pool2.messages.size === 1;
  console.log(`  ${passed ? 'PASS' : 'FAIL'}: Same providerEventId should be deduplicated - only 1 conversation and 1 message\n`);
  if (!passed) process.exitCode = 1;
  
  console.log('=== Summary ===');
  console.log('P1-01 deduplication test completed.');
}

main().catch(console.error);
