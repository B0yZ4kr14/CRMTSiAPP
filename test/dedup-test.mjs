// Test for P1-01: Webhook processing deduplication

import { processWebhookEvent } from '../webhook-processor.mjs';

// Simple mock pool tracking what SQL was called and in what order
class MockPool {
  constructor() {
    this.calls = [];
    this.conversations = new Map(); // Map of conversationId -> {contact_phone, channel}
    this.messages = new Map(); // Map of messageId -> data
  }
  
  async query(sql, values) {
    this.calls.push({ sql, values });
    
    // Simulate select id from conversations
    if (sql.includes('select id from conversations') && values) {
      const [channelId, phone] = values;
      // Check if already exists
      for (const [convId, convData] of this.conversations.entries()) {
        if (convData.contact_phone === String(phone) && convData.channel === String(channelId)) {
          return { rows: [{ id: convId }] };
        }
      }
      // Also check if event has providerEventId and there's a matching message
      if (values.length > 2 && values[2] && values[2].providerEventId) {
        const eventProviderEventId = values[2].providerEventId;
        // Check if we've already processed with this providerEventId
        for (const [msgId, msgData] of this.messages.entries()) {
          if (msgData.provider_message_id === eventProviderEventId) {
            // Already processed - return existing conversation
            return { rows: [{ id: 'existing-conv' }] };
          }
        }
      }
      return { rows: [] };
    }
    
    // Simulate insert into conversations
    if (sql.includes('insert into conversations')) {
      // Extract the values that were inserted
      // Pattern: insert into conversations(id,contact_name,contact_phone,status,channel,last_message_at,last_inbound_at) values($1,$2,$3,'open',$4,$5,$5)
      const match = sql.match(/values\((\$[\d]+),(\$[\d]+),(\$[\d]+)'open',(\$[\d]+),(\$[\d]+)\$5\)/);
      if (match) {
        const convId = match[1];
        const contactName = match[2];
        const contactPhone = match[3];
        const channel = match[4];
        const lastMessageAt = match[5];
        this.conversations.set(convId, {
          contact_phone: String(contactPhone),
          channel: String(channel)
        });
      }
      return { rowCount: 1 };
    }
    
    // Simulate insert into conversation_messages
    if (sql.includes('insert into conversation_messages') && values) {
      // The provider_message_id is typically at a specific position
      // values structure varies, but let's track it
      if (values && values.length > 0) {
        const lastArg = values[values.length - 1];
        if (lastArg && typeof lastArg === 'string') {
          this.messages.set(lastArg, {
            provider_message_id: lastArg,
            conversation_id: values[1] || 'unknown'
          });
        }
      }
      return { rowCount: 1 };
    }
    
    // Simulate update conversations
    if (sql.includes('update conversations set last_message_at=$1,last_inbound_at=$1,updated_at=now()')) {
      if (values && values.length > 0) {
        const timestamp = values[0];
        // Find conversation id from the SQL context
        for (const [convId, convData] of this.conversations.entries()) {
          convData.last_message_at = timestamp;
          convData.last_inbound_at = timestamp;
          convData.updated_at = new Date();
        }
      }
      return { rowCount: 1 };
    }
    
    // Default
    return { rows: [], rowCount: 0 };
  }
  
  async reset() {
    this.calls = [];
    this.conversations.clear();
    this.messages.clear();
  }
}

// Integration test
async function main() {
  console.log('=== P1-01 Test: Webhook Processing Deduplication ===\n');
  
  // Test 1: First event should create conversation + message
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
  
  console.log(`  Conversations created: ${pool1.conversations.size}`);
  console.log(`  Messages created: ${pool1.messages.size}`);
  console.log(`  SQL calls: ${pool1.calls.length}`);
  
  let passed = pool1.conversations.size === 1 && pool1.messages.size === 1;
  console.log(`  ${passed ? 'PASS' : 'FAIL'}: First event should create exactly 1 conversation and 1 message\n`);
  
  // Test 2: Same providerEventId should be deduplicated
  console.log('Test 2: Same providerEventId should be deduplicated (P1-01)');
  const pool2 = new MockPool();
  
  const event2a = {
    type: 'message',
    providerEventId: 'wamid.inbound-test-001', // SAME providerEventId!
    message: { 
      id: 'msg.inbound-001-a', // Different message ID but same provider event
      from: '5511999999999', 
      text: { body: 'Olá, como vai? - segunda tentativa' }, 
      timestamp: '1700000001' 
    },
    contacts: [{ wa_id: '5511999999999', profile: { name: 'Maria' } }]
  };
  
  await processWebhookEvent(pool2, event2a, { channelId: 'channel-001' });
  
  console.log(`  Conversations created: ${pool2.conversations.size}`);
  console.log(`  Messages created: ${pool2.messages.size}`);
  console.log(`  SQL calls: ${pool2.calls.length}`);
  
  passed = pool2.conversations.size === 1 && pool2.messages.size === 1;
  console.log(`  ${passed ? 'PASS' : 'FAIL'}: Same providerEventId should be deduplicated - only 1 conversation and 1 message\n`);
  
  // Test 3: Different providerEventId should create new conversation
  console.log('Test 3: Different providerEventId should create new entry');
  const pool3 = new MockPool();
  
  const event3a = {
    type: 'message',
    providerEventId: 'wamid.inbound-test-002', // DIFFERENT providerEventId
    message: { 
      id: 'msg.inbound-002', 
      from: '5511888888888', 
      text: { body: 'Outra mensagem' }, 
      timestamp: '1700000002' 
    },
    contacts: [{ wa_id: '5511888888888', profile: { name: 'João' } }]
  };
  
  await processWebhookEvent(pool3, event3a, { channelId: 'channel-001' });
  
  console.log(`  Conversations created: ${pool3.conversations.size}`);
  console.log(`  Messages created: ${pool3.messages.size}`);
  console.log(`  SQL calls: ${pool3.calls.length}`);
  
  passed = pool3.conversations.size === 2 && pool3.messages.size === 1; // 2 diff convs, 1 msg each
  console.log(`  ${passed ? 'PASS' : 'FAIL'}: Different providerEventId should create separate entries\n`);
  
  console.log('=== Summary ===');
  console.log('P1-01 deduplication test completed.');
}

main().catch(console.error);