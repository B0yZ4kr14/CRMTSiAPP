const test = require('node:test');
const assert = require('node:assert/strict');
const { compileCampaignContent } = require('../modules/marketing/content-compiler');

const hostile = {
  blocks: [
    { type: 'paragraph', text: '<script>alert(1)</script><img src=x onerror=alert(1)>' },
    { type: 'button', text: 'Click', url: 'javascript:alert(1)' },
    { type: 'paragraph', text: '<svg><animate onbegin=alert(1)></animate></svg>' },
    { type: 'image', url: 'data:text/html,<script>alert(1)</script>' },
  ],
};

test('campaign compiler escapes scripts, event handlers, css, svg and unsafe URLs', () => {
  const result = compileCampaignContent(hostile, { channel: 'waha', variables: {} });
  assert.doesNotMatch(result.html, /<script|<img[^>]+onerror|<svg|javascript:|data:text\/html/i);
  assert.match(result.html, /&lt;script&gt;/);
  assert.doesNotMatch(result.text, /javascript:/i);
});

test('campaign compiler allows only safe https/http URLs and resolves approved variables', () => {
  const result = compileCampaignContent({ blocks: [{ type: 'button', text: 'Portal', url: 'https://portal.example.com/{{contact.id}}' }] }, { channel: 'meta', variables: { 'contact.id': '42' } });
  assert.match(result.html, /https:\/\/portal\.example\.com\/42/);
  assert.equal(result.channel, 'meta');

  const unsafe = compileCampaignContent({ blocks: [{ type: 'button', text: 'Bad', url: 'file:///etc/passwd' }] }, { channel: 'meta', variables: {} });
  assert.doesNotMatch(unsafe.html, /file:/i);
  assert.match(unsafe.text, /unsafe URL removed/);
});