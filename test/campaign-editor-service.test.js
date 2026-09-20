const test = require('node:test');
const assert = require('node:assert/strict');
const { createCampaignEditor } = require('../modules/marketing/campaign-service');

const content = { blocks: [{ type: 'paragraph', text: 'Olá {{contact.name}}' }] };

test('campaign editor drafts use CAS and publish immutable fingerprinted versions', () => {
  const editor = createCampaignEditor();
  const draft = editor.createDraft({ tenantId: 'tenant-a', name: 'Boas-vindas', channel: 'waha', content });
  const revised = editor.saveDraft({ tenantId: 'tenant-a', id: draft.id, expectedRevision: 1, content });
  assert.equal(revised.revision, 2);
  assert.throws(() => editor.saveDraft({ tenantId: 'tenant-a', id: draft.id, expectedRevision: 1, content }), /REVISION_CONFLICT/);
  const published = editor.publish({ tenantId: 'tenant-a', id: draft.id, expectedRevision: 2 });
  assert.equal(published.version, 1);
  assert.match(published.fingerprint, /^[a-f0-9]{64}$/);
});

test('campaign editor restore creates a fresh published version and dispatch reference pins it', () => {
  const editor = createCampaignEditor();
  const draft = editor.createDraft({ tenantId: 'tenant-a', name: 'Boas-vindas', channel: 'meta', content });
  const published = editor.publish({ tenantId: 'tenant-a', id: draft.id, expectedRevision: 1 });
  const restored = editor.restore({ tenantId: 'tenant-a', id: draft.id, version: 1 });
  assert.equal(restored.version, 2);
  assert.equal(restored.restoredFromVersion, 1);
  assert.deepEqual(editor.dispatchReference({ tenantId: 'tenant-a', id: draft.id }), { campaignId: draft.id, version: 2, fingerprint: restored.fingerprint, capabilityProfileVersion: 1 });
});