const test = require('node:test');
const assert = require('node:assert/strict');
const { can } = require('../rbac');

test('RBAC grants agents only conversation operations', () => {
  assert.equal(can('agent', 'conversation:read'), true);
  assert.equal(can('agent', 'conversation:write'), true);
  assert.equal(can('agent', 'settings:write'), false);
  assert.equal(can('agent', 'users:manage'), false);
});

test('RBAC makes viewers read-only and managers unable to rotate secrets', () => {
  assert.equal(can('viewer', 'conversation:read'), true);
  assert.equal(can('viewer', 'conversation:write'), false);
  assert.equal(can('manager', 'queue:manage'), true);
  assert.equal(can('manager', 'secret:rotate'), false);
});

test('RBAC gives administrators all declared capabilities and denies unknown roles/actions', () => {
  assert.equal(can('admin', 'secret:rotate'), true);
  assert.equal(can('admin', 'users:manage'), true);
  assert.equal(can('unknown', 'conversation:read'), false);
  assert.equal(can('agent', 'not-a-capability'), false);
});