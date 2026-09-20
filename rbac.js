const CAPABILITIES = new Set([
  'conversation:read', 'conversation:write', 'contact:read', 'contact:write', 'channel:read', 'dashboard:read',
  'queue:read', 'queue:manage', 'team:read', 'team:manage', 'template:read', 'template:manage',
  'settings:read', 'settings:write', 'secret:read', 'secret:rotate', 'audit:read',
  'users:manage', 'routing:manage', 'sla:manage', 'automation:manage', 'automation:simulate', 'automation:publish', 'automation:restore',
  'campaign:manage', 'campaign:preview', 'campaign:publish', 'campaign:restore',
  'privacy:read', 'privacy:manage', 'realtime:read',
]);

const ROLE_CAPABILITIES = {
  viewer: ['conversation:read', 'contact:read', 'queue:read', 'team:read', 'template:read', 'settings:read', 'dashboard:read', 'realtime:read'],
  agent: ['conversation:read', 'conversation:write', 'contact:read', 'contact:write', 'queue:read', 'team:read', 'template:read', 'dashboard:read', 'realtime:read'],
  manager: ['conversation:read', 'conversation:write', 'contact:read', 'contact:write', 'channel:read', 'queue:read', 'queue:manage', 'team:read', 'team:manage', 'template:read', 'template:manage', 'routing:manage', 'sla:manage', 'automation:manage', 'automation:simulate', 'campaign:manage', 'campaign:preview', 'realtime:read'],
  admin: [...CAPABILITIES],
};

const ALL_ROLES = Object.keys(ROLE_CAPABILITIES);

function can(role, capability) {
  return CAPABILITIES.has(capability) && Boolean(ROLE_CAPABILITIES[role]?.includes(capability));
}

module.exports = { CAPABILITIES, ROLE_CAPABILITIES, ALL_ROLES, can };