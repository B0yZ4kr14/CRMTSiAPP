const test = require('node:test');
const assert = require('node:assert/strict');
const { effectiveRole } = require('../authorization');

test('persisted role assignments override the legacy users.role field', () => {
  assert.equal(effectiveRole({ legacyRole: 'viewer', assignedRoles: ['agent'] }), 'agent');
  assert.equal(effectiveRole({ legacyRole: 'admin', assignedRoles: ['viewer'] }), 'viewer');
});

test('effective role uses the legacy role only while no role assignment exists', () => {
  assert.equal(effectiveRole({ legacyRole: 'manager', assignedRoles: [] }), 'manager');
  assert.equal(effectiveRole({ legacyRole: 'unknown', assignedRoles: [] }), null);
});
