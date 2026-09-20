const crypto = require('node:crypto');

function createCollaborationNote({ conversationId, author, body }) {
  return {
    id: crypto.randomUUID(),
    conversationId,
    author,
    body,
    createdAt: new Date()
  };
}

module.exports = { createCollaborationNote };
