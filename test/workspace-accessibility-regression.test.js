const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('workspace navigation marks the current destination and provides a mobile navigation control', () => {
  const html = renderWorkspace('inbox', {});
  assert.match(html, /class="nav-item active"[^>]*aria-current="page"[^>]*>Central/);
  assert.match(html, /<details class="mobile-navigation">/);
  assert.match(html, /<summary aria-label="Abrir navegação principal">/);
});

test('inbox has labelled operational regions and an accessible empty state', () => {
  const html = renderWorkspace('inbox', { conversations: [] });
  assert.match(html, /aria-label="Lista de conversas"/);
  assert.match(html, /aria-label="Conversa selecionada"/);
  assert.match(html, /role="status"/);
  assert.match(html, /class="empty-illustration" aria-hidden="true"/);
});

test('settings navigation marks its active workspace', () => {
  const html = renderWorkspace('settings/channels', { csrfToken: 'test' });
  assert.match(html, /class="settings-nav-item active"[^>]*aria-current="page"[^>]*>Canais e API/);
  assert.match(html, /<section class="settings-content"/);
});
