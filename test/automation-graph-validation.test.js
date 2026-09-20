const test = require('node:test');
const assert = require('node:assert/strict');
const { validateGraph } = require('../modules/automation/graph-validator');

const validGraph = {
  nodes: [
    { id: 'start', type: 'trigger.conversation_opened', config: {} },
    { id: 'assign', type: 'action.assign_queue', config: { queueId: 'queue-a' } },
  ],
  edges: [{ from: 'start', to: 'assign', port: 'next' }],
};

test('automation graph validator accepts a connected trigger-to-action graph', () => {
  const result = validateGraph(validGraph, { tenantId: 'tenant-a' });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('automation graph validator rejects cycles with localized edge errors', () => {
  const graph = { ...validGraph, edges: [...validGraph.edges, { from: 'assign', to: 'start', port: 'next' }] };
  const result = validateGraph(graph, { tenantId: 'tenant-a' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === 'GRAPH_CYCLE' && error.edge));
});

test('automation graph validator requires one reachable trigger and reachability for every node', () => {
  const unreachable = { ...validGraph, nodes: [...validGraph.nodes, { id: 'tag', type: 'action.add_tag', config: { tagId: 'tag-a' } }] };
  const result = validateGraph(unreachable, { tenantId: 'tenant-a' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === 'GRAPH_NODE_UNREACHABLE' && error.nodeId === 'tag'));
});

test('automation graph validator rejects dangling endpoints and unknown ports', () => {
  const dangling = { ...validGraph, edges: [{ from: 'start', to: 'missing', port: 'next' }] };
  const danglingResult = validateGraph(dangling, { tenantId: 'tenant-a' });
  assert.equal(danglingResult.valid, false);
  assert.ok(danglingResult.errors.some(error => error.code === 'GRAPH_EDGE_TARGET_UNKNOWN'));

  const badPort = { ...validGraph, edges: [{ from: 'start', to: 'assign', port: 'failure' }] };
  const portResult = validateGraph(badPort, { tenantId: 'tenant-a' });
  assert.equal(portResult.valid, false);
  assert.ok(portResult.errors.some(error => error.code === 'GRAPH_PORT_INVALID'));
});

test('automation graph validator enforces tenant-scoped references', () => {
  const graph = { ...validGraph, nodes: [{ id: 'start', type: 'trigger.conversation_opened', config: {} }, { id: 'assign', type: 'action.assign_queue', config: { queueId: 'queue-b' } }] };
  const result = validateGraph(graph, { tenantId: 'tenant-a', references: { queues: new Map([['queue-b', { tenantId: 'tenant-b' }]]) } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === 'GRAPH_REFERENCE_TENANT_MISMATCH' && error.nodeId === 'assign'));
});