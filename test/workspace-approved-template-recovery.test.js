const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('expired Meta conversations expose only approved channel templates for recovery', () => {
  const html = renderWorkspace('inbox', {
    selectedConversation: { id: 'conv-1', contact_name: 'Ana', status: 'open', channel: 'channel-1', channel_provider: 'meta' },
    customerServiceWindow: { open: false, expiresAt: '2026-09-17T12:00:00.000Z' },
    approvedTemplates: [{ id: 'template-1', name: 'retorno_inicial', language: 'pt_BR', body: 'Olá {{1}}', variable_count: 1 }],
    csrfToken: 'session-bound-token',
  });

  assert.match(html, /action="\/inbox\/conv-1\/templates"/);
  assert.match(html, /name="template_id"/);
  assert.match(html, /retorno_inicial/);
  assert.match(html, /name="variables"/);
  assert.match(html, /Enviar template aprovado/);
  assert.doesNotMatch(html, /action="\/inbox\/conv-1\/messages"/);
});

test('expired Meta conversations report when no approved template is available', () => {
  const html = renderWorkspace('inbox', {
    selectedConversation: { id: 'conv-1', contact_name: 'Ana', status: 'open', channel_provider: 'meta' },
    customerServiceWindow: { open: false }, csrfToken: 'token', approvedTemplates: [],
  });
  assert.match(html, /Nenhum template aprovado disponível/);
});
