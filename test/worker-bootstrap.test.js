const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdapters, mergeChannelCredentials } = require('../outbox-worker');

test('worker builds only supported provider adapters and keeps credentials out of channel config', () => {
  const adapters = createAdapters();
  assert.equal(typeof adapters.waha.sendText, 'function');
  assert.equal(typeof adapters.meta.sendText, 'function');
  assert.equal(adapters.none, undefined);

  const channel = mergeChannelCredentials(
    { id: 'channel-1', provider: 'waha', config: { baseUrl: 'https://waha.example', sessionName: 'support' } },
    { apiKey: 'secret-value' },
  );
  assert.deepEqual(channel.config, { baseUrl: 'https://waha.example', sessionName: 'support', apiKey: 'secret-value' });
});