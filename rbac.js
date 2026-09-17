const CAPABILITIES = new Set([
  'conversation:read', 'conversation:write', 'contact:read', 'contact:write',
  'queue:read', 'queue:manage', 'team:read', 'team:manage', 'template:read', 'template:manage',
  'settings:read', 'settings:write', 'secret:read', 'secret:rotate', 'audit:read',
  'users:manage', 'routing:manage', 'sla:manage', 'automation:manage', 'privacy:manage',
]);

const ROLE_CAPABILITIES = {
  viewer: ['conversation:read', 'contact:read', 'queue:read', 'team:read', 'template:read', 'settings:read'],
  agent: ['conversation:read', 'conversation:write', 'contact:read', 'contact:write', 'queue:read', 'team:read', 'template:read'],
  manager: ['conversation:read', 'conversation:write', 'contact:read', 'contact:write', 'queue:read', 'queue:manage', 'team:read', 'team:manage', 'template:read', 'template:manage', 'routing:manage', 'sla:manage', 'audit:read'],
  admin: [...CAPABILITIES],
};

function can(role, capability) {
  return CAPABILITIES.has(capability) && Boolean(ROLE_CAPABILITIES[role]?.includes(capability));
}

module.exports = { CAPABILITIES, ROLE_CAPABILITIES, can };