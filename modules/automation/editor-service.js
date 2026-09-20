const crypto = require('node:crypto');
const { validateGraph } = require('./graph-validator');
const { canonicalGraphHash } = require('./graph-schema');

function editorError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function createAutomationEditor() {
  const drafts = new Map();
  const versions = new Map();

  function createDraft({ tenantId, name, graph }) {
    const validation = validateGraph(graph, { tenantId });
    if (!validation.valid) throw editorError('GRAPH_INVALID');
    const id = crypto.randomUUID();
    const draft = { id, tenantId, name: String(name || '').trim(), graph: validation.graph, revision: 1, status: 'draft', fingerprint: canonicalGraphHash(validation.graph) };
    drafts.set(id, draft);
    versions.set(id, []);
    return structuredClone(draft);
  }

  function getDraft(tenantId, id) {
    const draft = drafts.get(id);
    if (!draft || draft.tenantId !== tenantId) throw editorError('NOT_FOUND');
    return draft;
  }

  function saveDraft({ tenantId, id, expectedRevision, graph, name }) {
    const current = getDraft(tenantId, id);
    if (current.status !== 'draft') throw editorError('DRAFT_NOT_EDITABLE');
    if (current.revision !== expectedRevision) throw editorError('REVISION_CONFLICT');
    const validation = validateGraph(graph, { tenantId });
    if (!validation.valid) throw editorError('GRAPH_INVALID');
    const updated = { ...current, name: name === undefined ? current.name : String(name).trim(), graph: validation.graph, revision: current.revision + 1, fingerprint: canonicalGraphHash(validation.graph) };
    drafts.set(id, updated);
    return structuredClone(updated);
  }

  function publish({ tenantId, id, expectedRevision }) {
    const current = getDraft(tenantId, id);
    if (current.status !== 'draft') throw editorError('DRAFT_NOT_EDITABLE');
    if (current.revision !== expectedRevision) throw editorError('REVISION_CONFLICT');
    const validation = validateGraph(current.graph, { tenantId });
    if (!validation.valid) throw editorError('GRAPH_INVALID');
    const history = versions.get(id);
    const version = history.length + 1;
    const published = Object.freeze({ ...current, version, status: 'published', publishedAt: new Date().toISOString(), fingerprint: canonicalGraphHash(current.graph) });
    history.push(published);
    drafts.set(id, { ...current, status: 'published' });
    return structuredClone(published);
  }

  function restore({ tenantId, id, version }) {
    const current = getDraft(tenantId, id);
    const source = (versions.get(id) || []).find(item => item.version === version);
    if (!source || source.tenantId !== tenantId) throw editorError('VERSION_NOT_FOUND');
    const history = versions.get(id);
    const restored = Object.freeze({ id, tenantId, name: source.name, graph: structuredClone(source.graph), revision: current.revision + 1, version: history.length + 1, status: 'published', restoredFromVersion: version, publishedAt: new Date().toISOString(), fingerprint: source.fingerprint });
    history.push(restored);
    drafts.set(id, { ...current, status: 'published', revision: restored.revision, graph: structuredClone(source.graph), fingerprint: source.fingerprint });
    return structuredClone(restored);
  }

  function executionReference({ tenantId, id }) {
    const current = getDraft(tenantId, id);
    const history = versions.get(id) || [];
    const published = history.at(-1);
    if (!published || published.tenantId !== tenantId) throw editorError('PUBLISHED_VERSION_REQUIRED');
    return { automationId: id, version: published.version, fingerprint: published.fingerprint };
  }

  return { createDraft, getDraft: (args) => structuredClone(getDraft(args.tenantId, args.id)), saveDraft, publish, restore, executionReference };
}

module.exports = { createAutomationEditor };