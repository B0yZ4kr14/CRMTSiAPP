const test = require('node:test');
const assert = require('node:assert/strict');
const { conversationScope } = require('../server');

const USER = 'user-1';
const TENANT = '11111111-1111-4111-8111-111111111111';

test('conversation scope requires a tenant predicate for every role', () => {
  for (const role of ['admin', 'manager', 'agent', 'viewer', null]) {
    const scope = conversationScope(role, USER, TENANT, 1);
    assert.match(scope.sql, /c\.tenant_id=\$1/);
    assert.equal(scope.values[0], TENANT);
  }
});

test('admin and manager retain global visibility only within their active tenant', () => {
  for (const role of ['admin', 'manager']) {
    assert.deepEqual(conversationScope(role, USER, TENANT, 1), {
      sql: 'c.tenant_id=$1',
      values: [TENANT],
    });
  }
});

test('agent and viewer scope adds assignment, active queue or team membership after tenant scope', () => {
  for (const role of ['agent', 'viewer', null]) {
    const scope = conversationScope(role, USER, TENANT, 1);
    assert.deepEqual(scope.values, [TENANT, USER]);
    assert.match(scope.sql, /c\.assigned_user_id=\$2/);
    assert.match(scope.sql, /queue_members/);
    assert.match(scope.sql, /team_members/);
  }
});
