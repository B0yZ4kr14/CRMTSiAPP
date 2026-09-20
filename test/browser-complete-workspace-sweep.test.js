const test = require('node:test');
const assert = require('node:assert/strict');
const { WORKSPACE_ROUTES } = require('./fixtures/workspace-route-catalog');
const { ROLE_CAPABILITIES } = require('./../rbac');

async function checkRoute(route, role) {
  // Mock browser fetch would go here
  const capability = require('../route-capabilities').ROUTE_CAPABILITIES[route.method + ' ' + route.path];
  if (!capability) return { ok: false, error: 'capability missing' };
  return { ok: ROLE_CAPABILITIES[role].includes(capability) };
}

test('authenticated role/action sweep covers all workspaces', async () => {
  for (const route of WORKSPACE_ROUTES) {
    const result = await checkRoute(route, route.role);
    assert.ok(result.ok, `Access failed for ${route.method} ${route.path} by ${route.role}`);
  }
});
