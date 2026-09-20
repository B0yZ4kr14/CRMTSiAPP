const test = require('node:test');
const assert = require('node:assert/strict');
const { createOperationContext } = require('../modules/shared/operation-context');

test('operation context propagation rejects missing tenant context', () => {
  assert.throws(() => createOperationContext({ actor: { id: 'user-a' } }), /tenant context missing/);
});

test('operation context correctly initializes and propagates tenant, actor, and trace identity', () => {
  const ctx = createOperationContext({
    tenantId: '11111111-1111-4111-8111-111111111111',
    actor: { id: 'user-a', role: 'admin' },
    correlationId: 'trace-1'
  });
  assert.equal(ctx.tenantId, '11111111-1111-4111-8111-111111111111');
  assert.equal(ctx.actorId, 'user-a');
  assert.equal(ctx.requestId, 'trace-1');
  assert.deepEqual(ctx.capabilities, ['*']);
  assert.equal(Object.isFrozen(ctx), true);
});
