const test = require('node:test');
const assert = require('node:assert/strict');
const { effectiveRole } = require('../authorization');

test('persisted role assignments override the legacy users.role field', () => {
  assert.equal(effectiveRole({ legacyRole: 'viewer', assignedRoles: ['agent'] }), 'agent');
  assert.equal(effectiveRole({ legacyRole: 'admin', assignedRoles: ['viewer'] }), 'viewer');
});

test('assigned role ambiguity and invalid persisted assignments fail closed regardless of order', () => {
  assert.equal(effectiveRole({ legacyRole: 'viewer', assignedRoles: ['admin', 'viewer'] }), null);
  assert.equal(effectiveRole({ legacyRole: 'viewer', assignedRoles: ['viewer', 'admin'] }), null);
  assert.equal(effectiveRole({ legacyRole: 'admin', assignedRoles: ['invalid'] }), null);
  assert.equal(effectiveRole({ legacyRole: 'viewer', assignedRoles: ['manager', 'manager'] }), 'manager');
});
