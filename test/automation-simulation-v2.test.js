const test = require('node:test');
const assert = require('node:assert/strict');
const { simulateGraph } = require('../modules/automation/compiler');

const graph = {
  nodes: [
    { id: 'start', type: 'trigger.conversation_opened', config: {} },
    { id: 'assign', type: 'action.assign_queue', config: { queueId: 'queue-a' } },
  ],
  edges: [{ from: 'start', to: 'assign', port: 'next' }],
};

test('automation simulation is deterministic with fixed clock and zero effects', async () => {
  let effects = 0;
  const fixture = { id: 'event-1', tenantId: 'tenant-a', type: 'conversation.opened', data: { channel: 'whatsapp' } };
  const first = await simulateGraph({ graph, event: fixture, now: new Date('2026-01-01T00:00:00Z'), handlers: { assign_queue: async () => { effects += 1; } } });
  const second = await simulateGraph({ graph, event: fixture, now: new Date('2026-01-01T00:00:00Z'), handlers: { assign_queue: async () => { effects += 1; } } });
  assert.deepEqual(first, second);
  assert.equal(effects, 0);
  assert.equal(first.status, 'simulated');
  assert.equal(first.trace.nodes[1].outcome, 'would_execute');
  assert.equal(first.trace.generatedAt, '2026-01-01T00:00:00.000Z');
});