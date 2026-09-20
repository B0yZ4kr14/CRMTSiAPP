const test = require('node:test');
const assert = require('node:assert/strict');
const { compileCampaignContent } = require('../modules/marketing/content-compiler');
const { createPreview } = require('../modules/marketing/preview-service');

test('campaign preview and channel dispatch compile from one canonical output', () => {
  const content = {
    blocks: [
      { type: 'paragraph', text: 'Olá, {{contact.name}}' },
      { type: 'button', text: 'Portal', url: 'https://portal.example.com/{{contact.id}}' },
    ],
  };
  const variables = { 'contact.name': 'Ana', 'contact.id': '42' };
  const compiled = compileCampaignContent(content, { channel: 'waha', variables });
  const preview = createPreview({ content, channel: 'waha', variables });
  assert.equal(preview.html, compiled.html);
  assert.equal(preview.text, compiled.text);
  assert.equal(preview.capabilityProfileVersion, compiled.capabilityProfileVersion);
});

test('campaign compiler produces channel-specific capability-profile output', () => {
  const content = { blocks: [{ type: 'paragraph', text: 'Olá' }, { type: 'button', text: 'Clique', url: 'https://example.com' }] };
  const waha = compileCampaignContent(content, { channel: 'waha' });
  const meta = compileCampaignContent(content, { channel: 'meta' });
  assert.equal(waha.channel, 'waha');
  assert.equal(meta.channel, 'meta');
  assert.equal(waha.capabilityProfileVersion, 1);
  assert.equal(meta.capabilityProfileVersion, 1);
});