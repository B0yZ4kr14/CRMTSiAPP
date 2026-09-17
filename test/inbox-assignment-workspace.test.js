const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('selected conversations expose a CSRF-protected ownership action with persisted queue and agent choices', () => {
  const html = renderWorkspace('inbox', {
    selectedConversation: { id: 'conv-1', contact_name: 'Ana', status: 'open', queue_id: 'queue-1', assigned_user_id: 'agent-1' },
    queues: [{ id: 'queue-1', name: 'Suporte' }, { id: 'queue-2', name: 'Comercial' }],
    assignableUsers: [{ id: 'agent-1', name: 'Rodolfo' }, { id: 'agent-2', name: 'Joana' }],
    csrfToken: 'session-bound-token',
  });

  assert.match(html, /action="\/inbox\/conv-1\/assignment"/);
  assert.match(html, /name="queue_id"/);
  assert.match(html, /name="assigned_user_id"/);
  assert.match(html, /name="csrf_token" value="session-bound-token"/);
  assert.match(html, /Suporte/);
  assert.match(html, /Joana/);
});

test('the inbox marks the Mine scope active only when the server reports it', () => {
  const html = renderWorkspace('inbox', { scope: 'mine' });
  assert.match(html, /inbox-tab active" href="\/inbox\?scope=mine">Minhas/);
});
