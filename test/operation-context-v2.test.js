const test = require('node:test');
const assert = require('node:assert/strict');

const { createOperationContext } = require('../modules/shared/operation-context');
const { TENANT_A } = require('./fixtures/tenant-matrix');

test('operation context is immutable and contains only trusted identity fields', () => {
  const context = createOperationContext({
    tenantId: TENANT_A,
    actorId: 'user-a',
    capabilities: ['conversation:read', 'conversation:read'],
    requestId: 'request-1',
    payload: { tenantId: '22222222-2222-4222-8222-222222222222' },
  });
  assert.deepEqual(context, {
    tenantId: TENANT_A,
    actorId: 'user-a',
    capabilities: ['conversation:read'],
    requestId: 'request-1',
  });
  assert.equal(Object.isFrozen(context), true);
  assert.equal(Object.isFrozen(context.capabilities), true);
});

test('legacy actor input is accepted only with explicit request identity and admin capability', () => {
  const context = createOperationContext({ tenantId: TENANT_A, actor: { id: 'user-a', role: 'admin' }, correlationId: 'trace-1' });
  assert.equal(context.actorId, 'user-a');
  assert.deepEqual(context.capabilities, ['*']);
  assert.equal(context.requestId, 'trace-1');
});

test('operation context denies missing tenant, actor, request, or capabilities by default', () => {
  for (const input of [
    {},
    { tenantId: TENANT_A, actorId: 'user-a', requestId: 'r' },
    { tenantId: TENANT_A, capabilities: [], requestId: 'r' },
    { tenantId: TENANT_A, actorId: 'user-a', capabilities: [] },
  ]) assert.throws(() => createOperationContext(input), error => error.code === 'OPERATION_CONTEXT_INVALID');
});
