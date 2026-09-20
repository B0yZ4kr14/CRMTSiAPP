const test = require('node:test');
const assert = require('node:assert/strict');
const { can } = require('../rbac');
const { ROUTE_CAPABILITIES } = require('../route-capabilities');
const { createOperationContext } = require('../modules/shared/operation-context');

const SENSITIVE_ROUTE_CAPABILITIES = [
  'realtime:read', 'setup:read', 'setup:write', 'setup:activate', 'setup:manage',
  'provider:read', 'provider:manage', 'automation:manage', 'automation:simulate',
  'automation:publish', 'automation:restore', 'campaign:manage', 'campaign:preview',
  'campaign:publish', 'campaign:restore',
];

test('negative authorization matrix denies every sensitive capability to viewer and agent', () => {
  for (const capability of SENSITIVE_ROUTE_CAPABILITIES.filter(capability => capability !== 'realtime:read')) {
    assert.equal(can('viewer', capability), false, `viewer must not get ${capability}`);
    assert.equal(can('agent', capability), false, `agent must not get ${capability}`);
  }
});

test('editor publish and restore are administrator-only while managers can edit/simulate/preview', () => {
  for (const capability of ['automation:publish', 'automation:restore', 'campaign:publish', 'campaign:restore']) {
    assert.equal(can('manager', capability), false, `manager must not get ${capability}`);
    assert.equal(can('admin', capability), true, `admin must get ${capability}`);
  }
  for (const capability of ['automation:manage', 'automation:simulate', 'campaign:manage', 'campaign:preview']) {
    assert.equal(can('manager', capability), true, `manager must get ${capability}`);
  }
});

test('sensitive route registry entries map to declared capabilities', () => {
  for (const [route, capability] of Object.entries(ROUTE_CAPABILITIES)) {
    if (route.includes('setup') || route.includes('providers') || route.includes('automation') || route.includes('campaign')) {
      assert.ok(SENSITIVE_ROUTE_CAPABILITIES.includes(capability), `${route} must map to sensitive declared capability`);
    }
  }
});

test('operation context denies missing identity or tenant even for sensitive capabilities', () => {
  assert.throws(() => createOperationContext({ tenantId: '11111111-1111-4111-8111-111111111111', capabilities: ['automation:publish'], requestId: 'req' }), /actor identity missing/);
  assert.throws(() => createOperationContext({ actorId: 'admin-a', capabilities: ['campaign:publish'], requestId: 'req' }), /tenant context missing/);
});