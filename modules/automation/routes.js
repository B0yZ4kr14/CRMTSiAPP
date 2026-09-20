const { executeRule } = require('./engine');
const { createAutomationEditor } = require('./editor-service');
const { validateGraph } = require('./graph-validator');
const { simulateGraph } = require('./compiler');

function listRules(rules, { status } = {}) {
  return rules.filter(rule => !status || rule.status === status);
}

async function dryRunRule(input) {
  return executeRule({ ...input, dryRun: true });
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function createAutomationRoutes(options = {}) {
  const editor = options.editor || createAutomationEditor();

  return {
    createDraft: async ({ user, body }, res) => {
      try { json(res, 201, editor.createDraft({ tenantId: user.tenantId, name: body.name, graph: body.graph })); }
      catch (error) { json(res, 400, { error: { code: error.code || 'AUTOMATION_DRAFT_INVALID', message: 'automation draft invalid' } }); }
    },
    saveDraft: async ({ user, params, body }, res) => {
      try { json(res, 200, editor.saveDraft({ tenantId: user.tenantId, id: params.id, expectedRevision: Number(body.revision), graph: body.graph, name: body.name })); }
      catch (error) { json(res, error.code === 'REVISION_CONFLICT' ? 409 : 400, { error: { code: error.code || 'AUTOMATION_DRAFT_INVALID', message: 'automation draft invalid' } }); }
    },
    validate: async ({ user, body }, res) => {
      const validation = validateGraph(body.graph, { tenantId: user.tenantId, references: body.references });
      json(res, validation.valid ? 200 : 422, validation);
    },
    simulate: async ({ user, body }, res) => {
      try { json(res, 200, await simulateGraph({ graph: body.graph, event: { ...body.event, tenantId: user.tenantId }, now: body.now || new Date(0), references: body.references })); }
      catch (error) { json(res, 422, { error: { code: error.code || 'AUTOMATION_SIMULATION_INVALID', message: 'automation simulation invalid' } }); }
    },
    publish: async ({ user, params, body }, res) => {
      try { json(res, 200, editor.publish({ tenantId: user.tenantId, id: params.id, expectedRevision: Number(body.revision) })); }
      catch (error) { json(res, error.code === 'REVISION_CONFLICT' ? 409 : 400, { error: { code: error.code || 'AUTOMATION_PUBLISH_INVALID', message: 'automation publish invalid' } }); }
    },
    restore: async ({ user, params, body }, res) => {
      try { json(res, 201, editor.restore({ tenantId: user.tenantId, id: params.id, version: Number(body.version) })); }
      catch (error) { json(res, 404, { error: { code: error.code || 'AUTOMATION_VERSION_NOT_FOUND', message: 'automation version not found' } }); }
    },
  };
}

module.exports = { dryRunRule, listRules, createAutomationRoutes };