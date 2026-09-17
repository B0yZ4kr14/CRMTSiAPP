const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('renders a channel health error instead of reporting WhatsApp connected', () => {
  const html = renderWorkspace('connections', {
    configured: true,
    connected: false,
    sessionName: 'tsi-atendimento',
    healthError: 'Adaptador indisponível',
  });
  assert.match(html, /Adaptador indisponível/);
  assert.doesNotMatch(html, /WhatsApp conectado/);
});

test('renders a connected state only after a successful health probe', () => {
  const html = renderWorkspace('connections', {
    configured: true,
    connected: true,
    sessionName: 'tsi-atendimento',
  });
  assert.match(html, /WhatsApp conectado/);
  assert.match(html, /Conexão validada/);
});
