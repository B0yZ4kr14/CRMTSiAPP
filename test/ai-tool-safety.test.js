const test = require('node:test');
const assert = require('node:assert/strict');
const { createOperationContext } = require('../modules/shared/operation-context');
const { createToolService, ToolSafetyError } = require('../modules/ai/tool-service');

const context = capabilities => createOperationContext({
  tenantId: '11111111-1111-4111-8111-111111111111',
  actorId: 'operator-a',
  requestId: 'request-ai-tool-safety',
  capabilities,
});

function service(executor = async input => ({ outcome: 'completed', value: input })) {
  return createToolService({
    tools: {
      'contact.lookup': {
        capability: 'contact:read',
        inputKeys: ['contactId'],
        execute: executor,
      },
      'contact.delete': {
        capability: 'contact:write',
        irreversible: true,
        inputKeys: ['contactId'],
        execute: executor,
      },
    },
  });
}

test('AI tool gate allows only registered tools, exact input contracts, and authorized domains', async () => {
  const tools = service();
  const allowed = context(['contact:read']);
  const preview = await tools.preview(allowed, { tool: 'contact.lookup', input: { contactId: 'contact-a' }, idempotencyKey: 'lookup-1' });
  assert.equal(preview.tool, 'contact.lookup');
  assert.equal(preview.requiresConfirmation, false);
  assert.equal(preview.tenantId, allowed.tenantId);
  await assert.rejects(
    () => tools.preview(allowed, { tool: 'contact.delete', input: { contactId: 'contact-a' }, idempotencyKey: 'delete-1' }),
    error => error instanceof ToolSafetyError && error.code === 'AI_TOOL_FORBIDDEN',
  );
  await assert.rejects(
    () => tools.preview(context(['contact:read']), { tool: 'system.shell', input: {}, idempotencyKey: 'unknown-1' }),
    error => error instanceof ToolSafetyError && error.code === 'AI_TOOL_NOT_ALLOWED',
  );
  await assert.rejects(
    () => tools.preview(allowed, { tool: 'contact.lookup', input: { contactId: 'contact-a', injected: true }, idempotencyKey: 'lookup-2' }),
    error => error instanceof ToolSafetyError && error.code === 'AI_TOOL_INPUT_INVALID',
  );
});

test('irreversible tools require an exact preview confirmation and execute at most once per tenant idempotency key', async () => {
  let calls = 0;
  const tools = service(async input => ({ outcome: 'completed', value: { ...input, calls: ++calls } }));
  const admin = context(['contact:write']);
  const preview = await tools.preview(admin, { tool: 'contact.delete', input: { contactId: 'contact-a' }, idempotencyKey: 'delete-2' });
  assert.equal(preview.requiresConfirmation, true);
  await assert.rejects(
    () => tools.execute(admin, { previewId: preview.id, confirmation: 'no', idempotencyKey: 'delete-2' }),
    error => error instanceof ToolSafetyError && error.code === 'AI_TOOL_CONFIRMATION_REQUIRED',
  );
  const executed = await tools.execute(admin, { previewId: preview.id, confirmation: preview.confirmation, idempotencyKey: 'delete-2' });
  const replay = await tools.execute(admin, { previewId: preview.id, confirmation: preview.confirmation, idempotencyKey: 'delete-2' });
  assert.equal(executed.status, 'completed');
  assert.deepEqual(replay, executed);
  assert.equal(calls, 1);
});

test('unknown tool outcome is fail-closed and remains idempotently visible for reconciliation', async () => {
  const tools = service(async () => ({ outcome: 'unknown', reason: 'provider timeout after write' }));
  const allowed = context(['contact:read']);
  const preview = await tools.preview(allowed, { tool: 'contact.lookup', input: { contactId: 'contact-a' }, idempotencyKey: 'unknown-2' });
  const result = await tools.execute(allowed, { previewId: preview.id, idempotencyKey: 'unknown-2' });
  assert.equal(result.status, 'reconciliation_required');
  assert.equal(result.outcome, 'unknown');
  assert.equal(result.retryAllowed, false);
  assert.deepEqual(await tools.getOperation(allowed, 'unknown-2'), result);
});
