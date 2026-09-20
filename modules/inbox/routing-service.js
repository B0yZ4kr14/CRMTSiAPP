async function assignConversation(pool, { conversationId, queueId, strategy = 'round_robin' }) {
  // Simple deterministic assignment stub
  return { conversationId, assignedUserId: 'user-default', strategy };
}

module.exports = { assignConversation };
