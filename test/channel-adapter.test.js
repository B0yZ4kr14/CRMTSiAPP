const test = require('node:test');
const assert = require('node:assert/strict');
const { FakeAdapter, verifyMetaSignature } = require('../channel-adapter');

test('FakeAdapter exposes a usable QR lifecycle and normalized delivery result', async () => {
  const adapter = new FakeAdapter();
  const channel = { id: 'channel-1', provider: 'waha', config: { sessionName: 'support' } };

  assert.equal((await adapter.health(channel)).state, 'disconnected');
  assert.match((await adapter.startSession(channel)).state, /starting|connected/);
  assert.match((await adapter.getQr(channel)).qr, /^fake-qr:/);
  const sent = await adapter.sendText({ channel, to: '5511999999999', body: 'Olá', clientMessageId: 'job-1' });
  assert.deepEqual(sent, { providerMessageId: 'fake:job-1', status: 'sent' });
});

test('Meta webhook verification accepts only a matching SHA-256 signature', () => {
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const secret = 'app-secret';
  const signature = `sha256=${require('crypto').createHmac('sha256', secret).update(body).digest('hex')}`;

  assert.equal(verifyMetaSignature({ rawBody: body, signature, appSecret: secret }), true);
  assert.equal(verifyMetaSignature({ rawBody: body, signature: 'sha256=deadbeef', appSecret: secret }), false);
});