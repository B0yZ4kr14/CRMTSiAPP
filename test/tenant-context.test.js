const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveTenantContext } = require('../tenant-context');

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

test('tenant context requires an explicit active membership', () => {
  assert.equal(resolveTenantContext({ activeTenantId: null, memberships: [TENANT_A] }), null);
  assert.equal(resolveTenantContext({ activeTenantId: TENANT_B, memberships: [TENANT_A] }), null);
  assert.equal(resolveTenantContext({ activeTenantId: TENANT_A, memberships: [TENANT_A] }), TENANT_A);
});

test('ambiguous memberships never select a tenant implicitly', () => {
  assert.equal(resolveTenantContext({ memberships: [TENANT_A, TENANT_B] }), null);
  assert.equal(resolveTenantContext({ activeTenantId: TENANT_B, memberships: [TENANT_A, TENANT_B] }), TENANT_B);
});

test('invalid tenant identifiers fail closed', () => {
  assert.equal(resolveTenantContext({ activeTenantId: 'not-a-uuid', memberships: ['not-a-uuid'] }), null);
});
