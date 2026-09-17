const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('renders server-side search and status filters in the Inbox', () => {
  const html = renderWorkspace('inbox', { filter: 'closed', query: 'ana', conversations: [] });
  assert.match(html, /name="q"/);
  assert.match(html, /name="filter"/);
  assert.match(html, /value="ana"/);
  assert.match(html, /Fechadas/);
  assert.match(html, /selected/);
});
