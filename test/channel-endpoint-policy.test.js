const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicIp, isTrustedUrl, resolveTrustedEndpoint } = require('../server');

test('channel endpoint policy rejects loopback, link-local and private address spellings', () => {
  for (const value of [
    'http://127.0.0.1:3000',
    'http://127.1:3000',
    'http://2130706433:3000',
    'http://0.0.0.0:3000',
    'http://[::1]:3000',
    'http://169.254.169.254/latest/meta-data',
    'http://172.21.10.1:3000',
    'http://192.168.1.1:3000',
    'http://10.0.0.1:3000',
  ]) assert.equal(isTrustedUrl(value), false, value);
});

test('channel endpoint policy allows only public HTTP(S) endpoints', () => {
  assert.equal(isTrustedUrl('https://waha.example.test'), true);
  assert.equal(isTrustedUrl('ftp://waha.example.test'), false);
});

test('channel endpoint resolution rejects private or mixed DNS answers', async () => {
  const privateLookup = async () => [{ address: '169.254.169.254', family: 4 }];
  const mixedLookup = async () => [{ address: '203.0.113.10', family: 4 }, { address: '10.0.0.2', family: 4 }];
  await assert.rejects(resolveTrustedEndpoint('https://waha.example.test', { lookup: privateLookup }), /rede não permitida/);
  await assert.rejects(resolveTrustedEndpoint('https://waha.example.test', { lookup: mixedLookup }), /rede não permitida/);
});

test('channel endpoint resolution accepts only a complete public DNS answer set', async () => {
  const lookup = async () => [{ address: '203.0.113.10', family: 4 }, { address: '2001:4860:4860::8888', family: 6 }];
  const resolved = await resolveTrustedEndpoint('https://waha.example.test', { lookup });
  assert.deepEqual(resolved.addresses, ['203.0.113.10', '2001:4860:4860::8888']);
  assert.equal(isPublicIp('10.0.0.1'), false);
  assert.equal(isPublicIp('203.0.113.10'), true);
});
