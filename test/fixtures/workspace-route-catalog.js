const WORKSPACE_ROUTES = [
  { path: '/', role: 'viewer', method: 'GET' },
  { path: '/inbox', role: 'agent', method: 'GET' },
  { path: '/connections', role: 'manager', method: 'GET' },
  { path: '/settings/channels', role: 'admin', method: 'GET' },
  { path: '/settings/queues', role: 'admin', method: 'GET' },
  { path: '/settings/templates', role: 'admin', method: 'GET' },
  { path: '/settings/team', role: 'admin', method: 'GET' },
  { path: '/settings/automation', role: 'admin', method: 'GET' },
  { path: '/settings/privacy', role: 'admin', method: 'GET' },
];

module.exports = { WORKSPACE_ROUTES };
