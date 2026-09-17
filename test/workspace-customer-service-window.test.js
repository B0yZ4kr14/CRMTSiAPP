const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('Meta conversation outside the service window does not render a free-form composer', () => {
  const html = renderWorkspace('inbox', {
    conversations: [{ id: 'conv-1', name: 'Ana' }],
    selectedConversation: { id: 'conv-1', contact_name: 'Ana', status: 'open', channel_provider: 'meta' },
    customerServiceWindow: { open: false, expiresAt: '2026-09-17T12:00:00.000Z' },
    csrfToken: 'token',
  });
  assert.match(html, /janela de atendimento Meta expirou/i);
  assert.doesNotMatch(html, /action="\/inbox\/conv-1\/messages"/);
});

test('Meta conversation inside the service window informs the operator and keeps the composer available', () => {
  const html = renderWorkspace('inbox', {
    conversations: [{ id: 'conv-1', name: 'Ana' }],
    selectedConversation: { id: 'conv-1', contact_name: 'Ana', status: 'open', channel_provider: 'meta' },
    customerServiceWindow: { open: true, expiresAt: '2026-09-18T12:00:00.000Z' },
    csrfToken: 'token',
  });
  assert.match(html, /Envio livre disponível até/);
  assert.match(html, /action="\/inbox\/conv-1\/messages"/);
});
