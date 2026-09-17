const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('channel configuration separates WAHA and Meta operational fields', () => {
  const html = renderWorkspace('settings/channels', { csrfToken: 'csrf' });
  assert.match(html, /Configuração WAHA/);
  assert.match(html, /URL da API WAHA/);
  assert.match(html, /Sessão WAHA/);
  assert.match(html, /Configuração Meta Cloud API/);
  assert.match(html, /WABA ID/);
  assert.match(html, /Phone Number ID/);
  assert.match(html, /Versão Graph API/);
});

test('inbox keeps new conversation reachable when list has conversations', () => {
  const html = renderWorkspace('inbox', { csrfToken: 'csrf', conversations: [{ id: 'c1', name: 'Ana' }] });
  assert.match(html, /id="nova-conversa"/);
  assert.match(html, /Nova conversa/);
});
