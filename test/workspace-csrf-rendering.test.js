const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('renders a session-bound CSRF token in every authenticated Inbox mutation form', () => {
  const html = renderWorkspace('inbox', {
    csrfToken: 'csrf.bound.token',
    conversations: [],
  });
  assert.match(html, /name="csrf_token" value="csrf\.bound\.token"/);
  assert.match(html, /action="\/inbox"/);
});

test('renders a CSRF token in conversation lifecycle and composer forms', () => {
  const html = renderWorkspace('inbox', {
    csrfToken: 'csrf.bound.token',
    conversations: [{ id: 'conv-1', name: 'Ana', preview: '' }],
    selectedConversation: { id: 'conv-1', contact_name: 'Ana', status: 'open' },
  });
  assert.equal((html.match(/name="csrf_token" value="csrf\.bound\.token"/g) || []).length, 4);
});
