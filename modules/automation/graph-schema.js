const crypto = require('node:crypto');

const GRAPH_NODE_TYPES = new Set([
  'trigger.conversation_opened',
  'trigger.message_received',
  'trigger.sla_breached',
  'trigger.schedule_elapsed',
  'action.assign_queue',
  'action.assign_user',
  'action.add_tag',
  'action.send_template',
  'action.create_task',
  'action.handoff',
]);

function graphError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortObject(value[key])]));
}

function normalizeNode(node) {
  if (!node || typeof node !== 'object' || !/^[A-Za-z0-9_-]{1,128}$/.test(String(node.id || ''))) throw graphError('GRAPH_NODE_ID_INVALID');
  if (!GRAPH_NODE_TYPES.has(node.type)) throw graphError('GRAPH_NODE_TYPE_UNSUPPORTED');
  return { id: String(node.id), type: String(node.type), config: sortObject(node.config || {}) };
}

function normalizeEdge(edge) {
  if (!edge || typeof edge !== 'object' || !/^[A-Za-z0-9_-]{1,128}$/.test(String(edge.from || '')) || !/^[A-Za-z0-9_-]{1,128}$/.test(String(edge.to || ''))) throw graphError('GRAPH_EDGE_INVALID');
  return { from: String(edge.from), to: String(edge.to), port: String(edge.port || 'next') };
}

function normalizeGraph(graph) {
  if (!graph || typeof graph !== 'object' || !Array.isArray(graph.nodes)) throw graphError('GRAPH_NODES_INVALID');
  if (!Array.isArray(graph.edges)) throw graphError('GRAPH_EDGES_INVALID');
  const nodes = graph.nodes.map(normalizeNode).sort((left, right) => left.id.localeCompare(right.id));
  const ids = new Set(nodes.map(node => node.id));
  if (ids.size !== nodes.length) throw graphError('GRAPH_NODE_ID_DUPLICATE');
  const edges = graph.edges.map(normalizeEdge).sort((left, right) => `${left.from}:${left.port}:${left.to}`.localeCompare(`${right.from}:${right.port}:${right.to}`));
  return { nodes, edges };
}

function canonicalGraphHash(graph) {
  return crypto.createHash('sha256').update(JSON.stringify(normalizeGraph(graph))).digest('hex');
}

module.exports = { GRAPH_NODE_TYPES, normalizeGraph, canonicalGraphHash, graphError };