const ROUTE_CAPABILITIES = Object.freeze({
  'POST /inbox': 'conversation:write',
  'POST /inbox/:id/messages': 'conversation:write',
  'POST /inbox/:id/status': 'conversation:write',
  'POST /inbox/:id/assignment': 'conversation:write',
  'POST /inbox/:id/templates': 'conversation:write',
  'POST /settings/channels': 'settings:write',
  'POST /settings/team': 'team:manage',
  'POST /settings/queues': 'queue:manage',
  'POST /settings/templates': 'template:manage',
  'POST /contacts': 'contact:write',
  'POST /leads': 'routing:manage',
});

module.exports = { ROUTE_CAPABILITIES };
