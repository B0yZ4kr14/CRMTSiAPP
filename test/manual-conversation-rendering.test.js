const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('renders the manual conversation action in the empty Inbox state', () => {
  const html = renderWorkspace('inbox', { conversations: [] });
  assert.match(html, /Nova conversa/);
  assert.match(html, /action="\/inbox"/);
  assert.match(html, /name="contact_name"/);
  assert.match(html, /name="contact_phone"/);
});
