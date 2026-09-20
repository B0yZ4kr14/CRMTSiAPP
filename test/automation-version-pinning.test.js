const test = require('node:test');
const assert = require('node:assert/strict');
const { executeRule } = require('../modules/automation/engine');

const rule = {
  id: 'rule-a',
  tenantId: 'tenant-a',
  version: 4,
  status: 'active',
  trigger: 'conversation.opened',
  conditions: [],
  actions: [{ type: 'assign_queue', queueId: 'queue-a' }],
};

test('automation execution retains the exact published version in trace and persistence payload', async () => {
  const result = await executeRule({ rule, event: { id: 'evt-a', tenantId: 'tenant-a', type: 'conversation.opened', data: {} }, handlers: { assign_queue: async () => {} } });
  assert.equal(result.status, 'completed');
  assert.equal(result.trace.automationVersion, 4);
  assert.equal(result.trace.automationId, 'rule-a');
});