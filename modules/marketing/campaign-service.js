const crypto = require('node:crypto');
const { normalizeCampaignContent } = require('./content-schema');
const { getCapabilityProfile } = require('./channel-capabilities');

function createCampaign({ name, status }) {
  return { id: 'camp-1', name, status, createdAt: new Date() };
}

function editorError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function canonicalFingerprint({ channel, content, capabilityProfileVersion }) {
  return crypto.createHash('sha256').update(JSON.stringify({ channel, content, capabilityProfileVersion })).digest('hex');
}

function createCampaignEditor() {
  const drafts = new Map();
  const versions = new Map();

  function createDraft({ tenantId, name, channel, content }) {
    const normalized = normalizeCampaignContent(content);
    const profile = getCapabilityProfile(channel);
    const id = crypto.randomUUID();
    const draft = { id, tenantId, name: String(name || '').trim(), channel: profile.channel, capabilityProfileVersion: profile.version, content: normalized, revision: 1, status: 'draft', fingerprint: canonicalFingerprint({ channel: profile.channel, content: normalized, capabilityProfileVersion: profile.version }) };
    drafts.set(id, draft);
    versions.set(id, []);
    return structuredClone(draft);
  }

  function getDraft(tenantId, id) {
    const draft = drafts.get(id);
    if (!draft || draft.tenantId !== tenantId) throw editorError('NOT_FOUND');
    return draft;
  }

  function saveDraft({ tenantId, id, expectedRevision, content, name, channel }) {
    const current = getDraft(tenantId, id);
    if (current.status !== 'draft') throw editorError('DRAFT_NOT_EDITABLE');
    if (current.revision !== expectedRevision) throw editorError('REVISION_CONFLICT');
    const normalized = normalizeCampaignContent(content);
    const profile = getCapabilityProfile(channel || current.channel);
    const updated = { ...current, name: name === undefined ? current.name : String(name).trim(), channel: profile.channel, capabilityProfileVersion: profile.version, content: normalized, revision: current.revision + 1, fingerprint: canonicalFingerprint({ channel: profile.channel, content: normalized, capabilityProfileVersion: profile.version }) };
    drafts.set(id, updated);
    return structuredClone(updated);
  }

  function publish({ tenantId, id, expectedRevision }) {
    const current = getDraft(tenantId, id);
    if (current.status !== 'draft') throw editorError('DRAFT_NOT_EDITABLE');
    if (current.revision !== expectedRevision) throw editorError('REVISION_CONFLICT');
    const history = versions.get(id);
    const published = Object.freeze({ ...current, version: history.length + 1, status: 'published', publishedAt: new Date().toISOString() });
    history.push(published);
    drafts.set(id, { ...current, status: 'published' });
    return structuredClone(published);
  }

  function restore({ tenantId, id, version }) {
    const current = getDraft(tenantId, id);
    const source = (versions.get(id) || []).find(item => item.version === version);
    if (!source || source.tenantId !== tenantId) throw editorError('VERSION_NOT_FOUND');
    const history = versions.get(id);
    const restored = Object.freeze({ ...source, revision: current.revision + 1, version: history.length + 1, status: 'published', restoredFromVersion: version, publishedAt: new Date().toISOString() });
    history.push(restored);
    drafts.set(id, { ...current, status: 'published', revision: restored.revision, content: structuredClone(source.content), fingerprint: source.fingerprint });
    return structuredClone(restored);
  }

  function dispatchReference({ tenantId, id }) {
    const current = getDraft(tenantId, id);
    const published = (versions.get(id) || []).at(-1);
    if (!published) throw editorError('PUBLISHED_VERSION_REQUIRED');
    return { campaignId: current.id, version: published.version, fingerprint: published.fingerprint, capabilityProfileVersion: published.capabilityProfileVersion };
  }

  return { createDraft, getDraft: args => structuredClone(getDraft(args.tenantId, args.id)), saveDraft, publish, restore, dispatchReference };
}

module.exports = { createCampaign, createCampaignEditor, canonicalFingerprint };