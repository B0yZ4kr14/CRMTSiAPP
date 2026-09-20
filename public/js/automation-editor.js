(function exposeAutomationEditor(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CrmAutomationEditor = api;
})(typeof globalThis === 'object' ? globalThis : this, function automationEditorFactory() {
  function createAutomationEditor(options = {}) {
    const onChange = options.onChange || (() => {});
    const announce = options.announce || (() => {});
    const state = { nodes: [...(options.graph?.nodes || [])], edges: [...(options.graph?.edges || [])] };

    function graph() { return structuredClone(state); }
    function addNode(node) {
      state.nodes.push({ ...node });
      announce(`Nó ${node.type} adicionado`);
      onChange(graph());
      return graph();
    }
    function connect(from, to, port = 'next') {
      state.edges.push({ from, to, port });
      announce(`Conexão de ${from} para ${to} criada`);
      onChange(graph());
      return graph();
    }
    function moveNode(id, delta) {
      const index = state.nodes.findIndex(node => node.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= state.nodes.length) return graph();
      [state.nodes[index], state.nodes[target]] = [state.nodes[target], state.nodes[index]];
      announce(`Nó movido para posição ${target + 1}`);
      onChange(graph());
      return graph();
    }
    function removeNode(id) {
      state.nodes = state.nodes.filter(node => node.id !== id);
      state.edges = state.edges.filter(edge => edge.from !== id && edge.to !== id);
      announce(`Nó removido`);
      onChange(graph());
      return graph();
    }
    return { graph, addNode, connect, moveNode, removeNode };
  }
  return { createAutomationEditor };
});