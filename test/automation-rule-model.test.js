const test = require('node:test');
const assert = require('node:assert/strict');

const { createAutomationRule, transitionAutomationRule } = require('../modules/automation/rule-service');

test('automation rule requires an allowed trigger, typed conditions/actions, and a tenant', () => {
  assert.throws(
    () => createAutomationRule({ tenantId: 'tenant-a', name: 'Invalid trigger', trigger: 'sql.execute', conditions: [], actions: [] }),
    /unsupported trigger/i,
  );
  assert.throws(
    () => createAutomationRule({ tenantId: 'tenant-a', name: 'Bad action', trigger: 'conversation.opened', conditions: [], actions: [{ type: 'sql.execute' }] }),
    /unsupported action/i,
  );
  assert.throws(
    () => createAutomationRule({ name: 'No tenant', trigger: 'conversation.opened', conditions: [], actions: [] }),
    /tenant/i,
  );
});

test('automation rule is immutable and creates a new version for content changes', () => {
  const original = createAutomationRule({
    tenantId: 'tenant-a',
    name: 'Assign new conversations',
    trigger: 'conversation.opened',
    conditions: [{ field: 'conversation.channel', operator: 'equals', value: 'whatsapp' }],
    actions: [{ type: 'assign_queue', queueId: 'queue-a' }],
  });
  const revised = createAutomationRule({ ...original, name: 'Assign WhatsApp conversations', version: original.version + 1 });

  assert.equal(original.version, 1);
  assert.equal(revised.version, 2);
  assert.notEqual(original.id, revised.id);
  assert.equal(original.name, 'Assign new conversations');
});

test('automation rule only permits valid lifecycle transitions', () => {
  const draft = createAutomationRule({ tenantId: 'tenant-a', name: 'Rule', trigger: 'conversation.opened', conditions: [], actions: [] });
  const active = transitionAutomationRule(draft, 'active');
  assert.equal(active.status, 'active');
  assert.throws(() => transitionAutomationRule(active, 'draft'), /invalid automation transition/i);
  assert.equal(transitionAutomationRule(active, 'paused').status, 'paused');
  assert.equal(transitionAutomationRule(transitionAutomationRule(active, 'paused'), 'archived').status, 'archived');
});
