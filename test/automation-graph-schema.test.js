const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeGraph, canonicalGraphHash, GRAPH_NODE_TYPES } = require('../modules/automation/graph-schema');

test('automation graph normalizes node and edge ordering deterministically', () => {
  const first = normalizeGraph({
    nodes: [{ id: 'b', type: 'action.assign_queue', config: { queueId: 'q1' } }, { id: 'a', type: 'trigger.conversation_opened', config: {} }],
    edges: [{ from: 'a', to: 'b', port: 'next' }],
  });
  const second = normalizeGraph({
    edges: [{ to: 'b', port: 'next', from: 'a' }],
    nodes: [{ config: {}, type: 'trigger.conversation_opened', id: 'a' }, { config: { queueId: 'q1' }, type: 'action.assign_queue', id: 'b' }],
  });
  assert.deepEqual(first, second);
  assert.equal(canonicalGraphHash(first), canonicalGraphHash(second));
});

test('automation graph rejects unregistered node types and malformed shape', () => {
  assert.throws(() => normalizeGraph({ nodes: [{ id: 'x', type: 'sql.execute' }], edges: [] }), /GRAPH_NODE_TYPE_UNSUPPORTED/);
  assert.throws(() => normalizeGraph({ nodes: 'nope', edges: [] }), /GRAPH_NODES_INVALID/);
  assert.throws(() => normalizeGraph({ nodes: [{ id: '', type: 'trigger.conversation_opened' }], edges: [] }), /GRAPH_NODE_ID_INVALID/);
});

test('automation graph node registry contains explicit trigger and action types', () => {
  assert.ok(GRAPH_NODE_TYPES.has('trigger.conversation_opened'));
  assert.ok(GRAPH_NODE_TYPES.has('action.assign_queue'));
  assert.ok(GRAPH_NODE_TYPES.has('action.send_template'));
});