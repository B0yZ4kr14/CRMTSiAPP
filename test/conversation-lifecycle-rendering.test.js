const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('renders a close control for open conversations', () => {
  const html = renderWorkspace('inbox', { selectedConversation: { id: 'conv-1', contact_name: 'Ana', status: 'open' }, messages: [] });
  assert.match(html, /Fechar conversa/);
  assert.match(html, /action="\/inbox\/conv-1\/status"/);
});

test('renders a reopen control for closed conversations', () => {
  const html = renderWorkspace('inbox', { selectedConversation: { id: 'conv-1', contact_name: 'Ana', status: 'closed' }, messages: [] });
  assert.match(html, /Reabrir conversa/);
});
