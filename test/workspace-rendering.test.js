const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('renders the Deskcomm-inspired WhatsApp workspace navigation', () => {
  const html = renderWorkspace('inbox', {});
  assert.match(html, /Central/);
  assert.match(html, /Conversas/);
  assert.match(html, /Configurações/);
  assert.match(html, /CRMTSiAPP/);
});

test('renders the inbox empty state without claiming an active WhatsApp connection', () => {
  const html = renderWorkspace('inbox', { connected: false, conversations: [] });
  assert.match(html, /Nenhuma conversa/);
  assert.match(html, /Conecte um canal/);
  assert.doesNotMatch(html, /WhatsApp conectado/);
});

test('renders connection health and QR configuration state without exposing a secret', () => {
  const html = renderWorkspace('connections', { configured: true, connected: false, sessionName: 'tsi-atendimento' });
  assert.match(html, /Canal parceiro/);
  assert.match(html, /Aguardando conexão/);
  assert.match(html, /tsi-atendimento/);
  assert.doesNotMatch(html, /API_KEY|password|secret/i);
});

test('renders settings overview as executable UI shortcuts and keeps channel form reachable', () => {
  const overview = renderWorkspace('settings', { provider: 'waha', configured: false });
  assert.match(overview, /settings-quick-links/);
  assert.match(overview, /href="\/settings\/channels"/);
  assert.match(overview, /href="\/settings\/automation"/);

  const html = renderWorkspace('settings/channels', { provider: 'waha', configured: false });
  assert.match(html, /WhatsApp/);
  assert.match(html, /Provedor de canal/);
  assert.match(html, /WAHA compatível/);
  assert.match(html, /Criar canal e salvar configuração|Salvar canal/);
});
