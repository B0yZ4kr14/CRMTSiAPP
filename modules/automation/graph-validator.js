const { normalizeGraph } = require('./graph-schema');

const TRIGGER_TYPES = new Set([
  'trigger.conversation_opened',
  'trigger.message_received',
  'trigger.sla_breached',
  'trigger.schedule_elapsed',
]);

const PORTS = Object.freeze({
  'trigger.conversation_opened': new Set(['next']),
  'trigger.message_received': new Set(['next']),
  'trigger.sla_breached': new Set(['next']),
  'trigger.schedule_elapsed': new Set(['next']),
  'action.assign_queue': new Set(['next']),
  'action.assign_user': new Set(['next']),
  'action.add_tag': new Set(['next']),
  'action.send_template': new Set(['next']),
  'action.create_task': new Set(['next']),
  'action.handoff': new Set(['next']),
});

function validateGraph(graph, options = {}) {
  let normalized;
  try {
    normalized = normalizeGraph(graph);
  } catch (error) {
    return { valid: false, graph: null, errors: [{ code: error.code || 'GRAPH_INVALID' }] };
  }

  const errors = [];
  const byId = new Map(normalized.nodes.map(node => [node.id, node]));
  const triggers = normalized.nodes.filter(node => TRIGGER_TYPES.has(node.type));
  if (triggers.length !== 1) errors.push({ code: 'GRAPH_TRIGGER_COUNT_INVALID' });

  const outgoing = new Map(normalized.nodes.map(node => [node.id, []]));
  for (const edge of normalized.edges) {
    const source = byId.get(edge.from);
    const target = byId.get(edge.to);
    if (!source) {
      errors.push({ code: 'GRAPH_EDGE_SOURCE_UNKNOWN', edge });
      continue;
    }
    if (!target) {
      errors.push({ code: 'GRAPH_EDGE_TARGET_UNKNOWN', edge });
      continue;
    }
    if (!PORTS[source.type]?.has(edge.port)) {
      errors.push({ code: 'GRAPH_PORT_INVALID', edge });
      continue;
    }
    outgoing.get(edge.from).push(edge.to);
  }

  const visited = new Set();
  const visiting = new Set();
  function walk(nodeId) {
    if (visiting.has(nodeId)) {
      errors.push({ code: 'GRAPH_CYCLE', edge: { from: nodeId, to: nodeId } });
      return;
    }
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    for (const target of outgoing.get(nodeId) || []) walk(target);
    visiting.delete(nodeId);
    visited.add(nodeId);
  }
  for (const trigger of triggers) walk(trigger.id);

  for (const node of normalized.nodes) {
    if (!visited.has(node.id)) errors.push({ code: 'GRAPH_NODE_UNREACHABLE', nodeId: node.id });
    const queueId = node.config?.queueId;
    if (queueId && options.references?.queues?.has(queueId)) {
      const reference = options.references.queues.get(queueId);
      if (reference.tenantId !== options.tenantId) errors.push({ code: 'GRAPH_REFERENCE_TENANT_MISMATCH', nodeId: node.id, reference: queueId });
    }
  }

  return { valid: errors.length === 0, graph: normalized, errors };
}

module.exports = { validateGraph, TRIGGER_TYPES, PORTS };