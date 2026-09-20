const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCampaignContent, normalizeCampaignContent } = require('../modules/marketing/content-schema');
const { getCapabilityProfile } = require('../modules/marketing/channel-capabilities');

test('campaign content accepts allowlisted blocks, marks, variables and validates limits', () => {
  const valid = validateCampaignContent({
    blocks: [
      { type: 'paragraph', text: 'Olá, {{contact.name}}!', marks: ['bold'] },
      { type: 'button', text: 'Abrir portal', url: 'https://portal.example.com/{{contact.id}}' },
    ],
  });
  assert.equal(valid.valid, true);

  for (const invalid of [
    { blocks: [{ type: 'raw_html', text: '<b>x</b>' }] },
    { blocks: [{ type: 'paragraph', text: 'x', marks: ['blink'] }] },
    { blocks: [{ type: 'paragraph', text: '{{unknown.value}}' }] },
    { blocks: 'not-an-array' },
  ]) {
    assert.equal(validateCampaignContent(invalid).valid, false);
  }
});

test('campaign content normalizes a deterministic canonical representation', () => {
  const first = normalizeCampaignContent({ blocks: [{ text: 'Olá', marks: ['italic', 'bold'], type: 'paragraph' }] });
  const second = normalizeCampaignContent({ blocks: [{ type: 'paragraph', marks: ['bold', 'italic'], text: 'Olá' }] });
  assert.deepEqual(first, second);
});

test('campaign channel capability profiles are explicit and versioned', () => {
  const waha = getCapabilityProfile('waha');
  const meta = getCapabilityProfile('meta');
  assert.equal(waha.version, 1);
  assert.equal(meta.version, 1);
  assert.equal(waha.features.buttons, true);
  assert.equal(meta.features.templates, true);
  assert.throws(() => getCapabilityProfile('unknown'), /CHANNEL_NOT_SUPPORTED/);
});