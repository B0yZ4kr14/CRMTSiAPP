(function exposeCampaignEditor(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CrmCampaignEditor = api;
})(typeof globalThis === 'object' ? globalThis : this, function campaignEditorFactory() {
  function createCampaignEditor(options = {}) {
    const onChange = options.onChange || (() => {});
    const announce = options.announce || (() => {});
    const state = { blocks: [...(options.content?.blocks || [])] };
    function content() { return structuredClone(state); }
    function addBlock(type, fields = {}) {
      state.blocks.push({ type, text: '', marks: [], ...fields });
      announce(`Bloco ${type} adicionado`);
      onChange(content());
      return content();
    }
    function updateBlock(index, patch) {
      if (!state.blocks[index]) return content();
      state.blocks[index] = { ...state.blocks[index], ...patch };
      onChange(content());
      return content();
    }
    function moveBlock(index, delta) {
      const target = index + delta;
      if (index < 0 || target < 0 || target >= state.blocks.length) return content();
      [state.blocks[index], state.blocks[target]] = [state.blocks[target], state.blocks[index]];
      announce(`Bloco movido para posição ${target + 1}`);
      onChange(content());
      return content();
    }
    function removeBlock(index) {
      if (index < 0 || index >= state.blocks.length) return content();
      state.blocks.splice(index, 1);
      announce('Bloco removido');
      onChange(content());
      return content();
    }
    return { content, addBlock, updateBlock, moveBlock, removeBlock };
  }
  return { createCampaignEditor };
});