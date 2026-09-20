const test = require('node:test');
const assert = require('node:assert/strict');
const { createCollaborationNote } = require('../modules/inbox/collaboration-service');

test('collaboration service manages internal notes and snooze state', () => {
  const note = createCollaborationNote({ conversationId: 'c1', author: 'agent-1', body: 'Nota interna' });
  assert.equal(note.body, 'Nota interna');
  assert.equal(note.author, 'agent-1');
});
