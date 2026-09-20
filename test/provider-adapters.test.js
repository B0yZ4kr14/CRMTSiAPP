const test = require('node:test');
const assert = require('node:assert/strict');
const { WahaAdapter, MetaAdapter } = require('../channel-adapter');

test('WahaAdapter sends text through the official authenticated API contract', async () => {
  let request;
  const dispatcher = { close: async () => {} };
  const adapter = new WahaAdapter({
    dispatcherFactory: async () => dispatcher,
    fetchFn: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ id: 'waha-message-1' }), { status: 200 });
    },
  });
  const result = await adapter.sendText({
    channel: { config: { baseUrl: 'https://waha.example/', sessionName: 'support', apiKey: 'key-1' } },
    to: '5511999999999', body: 'Olá', clientMessageId: 'job-1',
  });
  assert.equal(String(request.url), 'https://waha.example/api/sendText');
  assert.equal(request.options.headers['X-Api-Key'], 'key-1');
  assert.equal(request.options.dispatcher, dispatcher);
  assert.equal(request.options.redirect, 'manual');
  assert.deepEqual(JSON.parse(request.options.body), { session: 'support', chatId: '5511999999999@c.us', text: 'Olá' });
  assert.deepEqual(result, { providerMessageId: 'waha-message-1', status: 'sent' });
});

test('WahaAdapter refuses private DNS before attaching the API credential', async () => {
  let fetchCalls = 0;
  const adapter = new WahaAdapter({
    lookup: async () => [{ address: '169.254.169.254', family: 4 }],
    fetchFn: async () => { fetchCalls += 1; throw new Error('must not fetch'); },
  });
  await assert.rejects(() => adapter.sendText({
    channel: { config: { baseUrl: 'https://rebind.example/', sessionName: 'support', apiKey: 'secret-key' } },
    to: '5511999999999', body: 'Olá',
  }), /non-public address/);
  assert.equal(fetchCalls, 0);
});

test('MetaAdapter sendTemplate applies the bounded provider request wrapper', async () => {
  let options;
  const adapter = new MetaAdapter({ fetchFn: async (_url, requestOptions) => {
    options = requestOptions;
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.template-1' }] }), { status: 200 });
  } });
  const result = await adapter.sendTemplate({
    channel: { config: { graphVersion: 'v23.0', phoneNumberId: '123', accessToken: 'token-1' } },
    to: '5511999999999', name: 'retorno_inicial', language: 'pt_BR', variables: ['Ana'],
  });
  assert.equal(options.redirect, 'manual');
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(result, { providerMessageId: 'wamid.template-1', status: 'sent' });
});

test('MetaAdapter sendTemplate rejects a successful response without a provider message id', async () => {
  const adapter = new MetaAdapter({ fetchFn: async () => new Response(JSON.stringify({ messages: [{}] }), { status: 200 }) });
  await assert.rejects(() => adapter.sendTemplate({
    channel: { config: { graphVersion: 'v23.0', phoneNumberId: '123', accessToken: 'token-1' } },
    to: '5511999999999', name: 'retorno_inicial', language: 'pt_BR', variables: ['Ana'],
  }), /provider message id is missing/);
});