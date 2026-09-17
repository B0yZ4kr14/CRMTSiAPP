const test = require('node:test');
const assert = require('node:assert/strict');
const { WahaAdapter, MetaAdapter } = require('../channel-adapter');

test('WahaAdapter sends text through the official authenticated API contract', async () => {
  let request;
  const adapter = new WahaAdapter({ fetchFn: async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ id: 'waha-message-1' }), { status: 200 });
  } });
  const result = await adapter.sendText({
    channel: { config: { baseUrl: 'https://waha.example/', sessionName: 'support', apiKey: 'key-1' } },
    to: '5511999999999', body: 'Olá', clientMessageId: 'job-1',
  });
  assert.equal(String(request.url), 'https://waha.example/api/sendText');
  assert.equal(request.options.headers['X-Api-Key'], 'key-1');
  assert.deepEqual(JSON.parse(request.options.body), { session: 'support', chatId: '5511999999999@c.us', text: 'Olá' });
  assert.deepEqual(result, { providerMessageId: 'waha-message-1', status: 'sent' });
});

test('MetaAdapter sends Graph API messages using the configured phone number and bearer token', async () => {
  let request;
  const adapter = new MetaAdapter({ fetchFn: async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 });
  } });
  const result = await adapter.sendText({
    channel: { config: { graphVersion: 'v23.0', phoneNumberId: '123', accessToken: 'token-1' } },
    to: '5511999999999', body: 'Olá', clientMessageId: 'job-1',
  });
  assert.equal(request.url, 'https://graph.facebook.com/v23.0/123/messages');
  assert.equal(request.options.headers.authorization, 'Bearer token-1');
  assert.deepEqual(JSON.parse(request.options.body), { messaging_product: 'whatsapp', to: '5511999999999', type: 'text', text: { body: 'Olá' } });
  assert.deepEqual(result, { providerMessageId: 'wamid.1', status: 'sent' });
});