const test = require('node:test');
const assert = require('node:assert/strict');
const { ROUTE_CAPABILITIES } = require('../route-capabilities');
const { ALL_ROLES, ROLE_CAPABILITIES, CAPABILITIES } = require('../rbac');

test('route registry covers all advertised routes and standard methods', () => {
  const routes = Object.keys(ROUTE_CAPABILITIES);
  assert.ok(routes.includes('GET /'));
  assert.ok(routes.includes('GET /settings/queues'));
  assert.ok(routes.includes('POST /settings/queues'));
});

test('every capability is assigned to at least one role', () => {
  for (const cap of CAPABILITIES) {
    let assigned = false;
    for (const role of ALL_ROLES) {
      if (ROLE_CAPABILITIES[role].includes(cap)) {
        assigned = true;
        break;
      }
    }
    assert.ok(assigned, `capability ${cap} is not assigned to any role`);
  }
});
