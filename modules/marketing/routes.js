const { createCampaignEditor } = require('./campaign-service');
const { validateCampaignContent } = require('./content-schema');
const { createPreview } = require('./preview-service');

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function createCampaignRoutes(options = {}) {
  const editor = options.editor || createCampaignEditor();

  return {
    createDraft: async ({ user, body }, res) => {
      try { json(res, 201, editor.createDraft({ tenantId: user.tenantId, name: body.name, channel: body.channel, content: body.content })); }
      catch (error) { json(res, 400, { error: { code: error.code || 'CAMPAIGN_DRAFT_INVALID', message: 'campaign draft invalid' } }); }
    },
    saveDraft: async ({ user, params, body }, res) => {
      try { json(res, 200, editor.saveDraft({ tenantId: user.tenantId, id: params.id, expectedRevision: Number(body.revision), name: body.name, channel: body.channel, content: body.content })); }
      catch (error) { json(res, error.code === 'REVISION_CONFLICT' ? 409 : 400, { error: { code: error.code || 'CAMPAIGN_DRAFT_INVALID', message: 'campaign draft invalid' } }); }
    },
    preview: async ({ body }, res) => {
      const validation = validateCampaignContent(body.content);
      if (!validation.valid) return json(res, 422, { error: { code: validation.error, message: 'campaign content invalid' } });
      try { json(res, 200, createPreview({ content: validation.content, channel: body.channel, variables: body.variables || {} })); }
      catch (error) { json(res, 422, { error: { code: error.code || 'CAMPAIGN_PREVIEW_INVALID', message: 'campaign preview invalid' } }); }
    },
    publish: async ({ user, params, body }, res) => {
      try { json(res, 200, editor.publish({ tenantId: user.tenantId, id: params.id, expectedRevision: Number(body.revision) })); }
      catch (error) { json(res, error.code === 'REVISION_CONFLICT' ? 409 : 400, { error: { code: error.code || 'CAMPAIGN_PUBLISH_INVALID', message: 'campaign publish invalid' } }); }
    },
    restore: async ({ user, params, body }, res) => {
      try { json(res, 201, editor.restore({ tenantId: user.tenantId, id: params.id, version: Number(body.version) })); }
      catch (error) { json(res, 404, { error: { code: error.code || 'CAMPAIGN_VERSION_NOT_FOUND', message: 'campaign version not found' } }); }
    },
  };
}

module.exports = { createCampaignRoutes };