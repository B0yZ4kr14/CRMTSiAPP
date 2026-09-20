const { validateGraph } = require('./graph-validator');

function topologicalNodes(graph) {
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const incoming = new Map(graph.nodes.map(node => [node.id, 0]));
  const outgoing = new Map(graph.nodes.map(node => [node.id, []]));
  for (const edge of graph.edges) {
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outgoing.get(edge.from).push(edge.to);
  }
  const ready = [...graph.nodes.filter(node => incoming.get(node.id) === 0)].sort((left, right) => left.id.localeCompare(right.id));
  const sorted = [];
  while (ready.length) {
    const node = ready.shift();
    sorted.push(node);
    for (const target of outgoing.get(node.id).sort()) {
      incoming.set(target, incoming.get(target) - 1);
      if (incoming.get(target) === 0) ready.push(byId.get(target));
      ready.sort((left, right) => left.id.localeCompare(right.id));
    }
  }
  return sorted;
}

function compileGraph(graph, options = {}) {
  const validation = validateGraph(graph, options);
  if (!validation.valid) {
    const error = new Error('GRAPH_INVALID');
    error.code = 'GRAPH_INVALID';
    error.errors = validation.errors;
    throw error;
  }
  return { graph: validation.graph, nodes: topologicalNodes(validation.graph) };
}

async function simulateGraph({ graph, event, now = new Date(), handlers = {}, references }) {
  const compiled = compileGraph(graph, { tenantId: event.tenantId, references });
  const nodes = [];
  for (const node of compiled.nodes) {
    if (node.type.startsWith('trigger.')) {
      nodes.push({ nodeId: node.id, type: node.type, outcome: node.type === `trigger.${event.type.replace('.', '_')}` ? 'matched' : 'evaluated' });
    } else {
      nodes.push({ nodeId: node.id, type: node.type, outcome: 'would_execute', config: node.config });
    }
  }
  return { status: 'simulated', trace: { eventId: event.id, generatedAt: new Date(now).toISOString(), nodes } };
}

module.exports = { compileGraph, simulateGraph, topologicalNodes };