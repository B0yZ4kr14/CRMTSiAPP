const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('renders persisted conversation rows in the Central', () => {
  const html = renderWorkspace('inbox', {
    conversations: [{ id: 'conv-1', name: 'Ana Souza', preview: 'Preciso de uma proposta.', status: 'open' }],
  });
  assert.match(html, /Ana Souza/);
  assert.match(html, /Preciso de uma proposta/);
  assert.match(html, /href="\/inbox\/conv-1"/);
});

test('renders a selected conversation with its messages and composer', () => {
  const html = renderWorkspace('inbox', {
    conversations: [{ id: 'conv-1', name: 'Ana Souza', preview: 'Olá' }],
    selectedConversation: { id: 'conv-1', contact_name: 'Ana Souza', contact_phone: '+5511999999999', status: 'open' },
    messages: [
      { direction: 'inbound', body: 'Olá, preciso de uma proposta.', created_at: '2026-09-16T12:00:00.000Z' },
      { direction: 'outbound', body: 'Claro, vou preparar.', created_at: '2026-09-16T12:01:00.000Z' },
    ],
  });
  assert.match(html, /Olá, preciso de uma proposta/);
  assert.match(html, /Claro, vou preparar/);
  assert.match(html, /Enviar mensagem/);
  assert.match(html, /Ana Souza/);
});
