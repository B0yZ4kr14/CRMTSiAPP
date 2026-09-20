const test = require('node:test');
const assert = require('node:assert/strict');
const { createAutomationEditor } = require('../modules/automation/editor-service');

const graph = {
  nodes: [
    { id: 'start', type: 'trigger.conversation_opened', config: {} },
    { id: 'assign', type: 'action.assign_queue', config: { queueId: 'queue-a' } },
  ],
  edges: [{ from: 'start', to: 'assign', port: 'next' }],
};

test('automation editor saves drafts with CAS and rejects stale revision writes', () => {
  const editor = createAutomationEditor();
  const created = editor.createDraft({ tenantId: 'tenant-a', name: 'Route inbound', graph });
  const revised = editor.saveDraft({ tenantId: 'tenant-a', id: created.id, expectedRevision: 1, graph });
  assert.equal(revised.revision, 2);
  assert.throws(() => editor.saveDraft({ tenantId: 'tenant-a', id: created.id, expectedRevision: 1, graph }), /REVISION_CONFLICT/);
});

test('automation editor publishes immutable versions and restores by creating another version', () => {
  const editor = createAutomationEditor();
  const draft = editor.createDraft({ tenantId: 'tenant-a', name: 'Route inbound', graph });
  const published = editor.publish({ tenantId: 'tenant-a', id: draft.id, expectedRevision: 1 });
  assert.equal(published.version, 1);
  assert.equal(published.status, 'published');
  assert.throws(() => editor.saveDraft({ tenantId: 'tenant-a', id: draft.id, expectedRevision: 1, graph }), /DRAFT_NOT_EDITABLE/);
  const restored = editor.restore({ tenantId: 'tenant-a', id: draft.id, version: 1 });
  assert.equal(restored.version, 2);
  assert.equal(restored.restoredFromVersion, 1);
});

test('automation editor pins executions to their exact published version', () => {
  const editor = createAutomationEditor();
  const draft = editor.createDraft({ tenantId: 'tenant-a', name: 'Route inbound', graph });
  const published = editor.publish({ tenantId: 'tenant-a', id: draft.id, expectedRevision: 1 });
  const execution = editor.executionReference({ tenantId: 'tenant-a', id: draft.id });
  assert.deepEqual(execution, { automationId: draft.id, version: published.version, fingerprint: published.fingerprint });
});