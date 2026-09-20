const test = require('node:test');
const assert = require('node:assert/strict');

const { createAutomationRule } = require('../modules/automation/rule-service');
const { executeRule } = require('../modules/automation/engine');

function rule(overrides = {}) {
  return createAutomationRule({
    tenantId: 'tenant-a',
    name: 'Route WhatsApp',
    trigger: 'conversation.opened',
    conditions: [{ field: 'conversation.channel', operator: 'equals', value: 'whatsapp' }],
    actions: [{ type: 'assign_queue', queueId: 'queue-a' }],
    ...overrides,
  });
}

test('automation dry-run returns a deterministic trace without invoking effects', async () => {
  let invoked = 0;
  const result = await executeRule({
    rule: rule(),
    event: { id: 'evt-1', type: 'conversation.opened', tenantId: 'tenant-a', data: { channel: 'whatsapp' } },
    dryRun: true,
    handlers: { assign_queue: async () => { invoked += 1; } },
  });

  assert.equal(invoked, 0);
  assert.equal(result.status, 'simulated');
  assert.equal(result.trace.eventId, 'evt-1');
  assert.equal(result.trace.actions[0].outcome, 'would_execute');
});

test('automation replays are idempotent by rule version and event identity', async () => {
  let invoked = 0;
  const executed = new Set();
  const input = {
    rule: rule(),
    event: { id: 'evt-2', type: 'conversation.opened', tenantId: 'tenant-a', data: { channel: 'whatsapp' } },
    handlers: { assign_queue: async () => { invoked += 1; } },
    executed,
  };

  assert.equal((await executeRule(input)).status, 'completed');
  assert.equal((await executeRule(input)).status, 'duplicate');
  assert.equal(invoked, 1);
});

test('automation rejects tenant mismatches and missing action handlers without partial effects', async () => {
  const mismatched = await executeRule({
    rule: rule(),
    event: { id: 'evt-3', type: 'conversation.opened', tenantId: 'tenant-b', data: { channel: 'whatsapp' } },
    handlers: { assign_queue: async () => { throw new Error('must not run'); } },
  });
  assert.equal(mismatched.status, 'rejected');
  assert.match(mismatched.reason, /tenant/i);

  const missingHandler = await executeRule({
    rule: rule(),
    event: { id: 'evt-4', type: 'conversation.opened', tenantId: 'tenant-a', data: { channel: 'whatsapp' } },
    handlers: {},
  });
  assert.equal(missingHandler.status, 'failed');
  assert.match(missingHandler.reason, /handler/i);
});
