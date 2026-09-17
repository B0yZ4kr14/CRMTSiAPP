const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('operational sidebar never advertises a route that the CRM does not render', () => {
  const html = renderWorkspace('inbox', {});
  assert.match(html, /href="\/contacts"/);
  assert.match(html, /href="\/leads"/);
  const settings = renderWorkspace('settings/channels', {});
  assert.doesNotMatch(settings, /href="\/settings\/catalog">Atendimento/);
  assert.match(settings, /href="\/settings\/channels">Canais/);
  assert.match(settings, /href="\/settings\/team">Equipe e permissões/);
  assert.match(settings, /href="\/settings\/queues">Filas e SLA/);
  assert.match(settings, /href="\/settings\/templates">Templates/);
  assert.match(settings, /href="\/settings\/privacy">Dados e privacidade/);
});

test('inbox uses actionable persisted-state tabs and exposes delivery feedback', () => {
  const html = renderWorkspace('inbox', {
    conversations: [{ id: 'conv-1', name: 'Ana', preview: 'Olá', status: 'open', assignee_name: 'Rodolfo', queue_name: 'Suporte', unread_count: 2 }],
    selectedConversation: { id: 'conv-1', contact_name: 'Ana', contact_phone: '5511999999999', status: 'open', queue_name: 'Suporte', assignee_name: 'Rodolfo' },
    messages: [{ direction: 'outbound', body: 'Retorno enviado', delivery_status: 'delivered', created_at: '2026-09-17T00:00:00Z' }],
    csrfToken: 'bound-token',
  });
  assert.match(html, /href="\/inbox\?filter=open"/);
  assert.match(html, /href="\/inbox\?scope=mine"/);
  assert.match(html, /Entregue/);
  assert.match(html, /Rodolfo/);
  assert.match(html, /Suporte/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Notas internas/);
});

test('channel workspace exposes a truthful executable setup path instead of disabled controls', () => {
  const html = renderWorkspace('connections', { channels: [] });
  assert.match(html, /Novo canal/);
  assert.match(html, /href="\/settings\/channels"/);
  assert.doesNotMatch(html, /<button disabled>Gerar QR<\/button>/);
  assert.doesNotMatch(html, /<button disabled>Conectar Meta<\/button>/);
});
