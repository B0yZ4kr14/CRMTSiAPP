const test = require('node:test');
const assert = require('node:assert/strict');
const { createSetupStateMachine } = require('../modules/setup/state-machine');
const { createAutomationEditor } = require('../modules/automation/editor-service');
const { createOperationRunner } = require('../modules/cli/operation-runner');
const { executeRule } = require('../modules/automation/engine');

const graph = { nodes: [{ id: 'start', type: 'trigger.conversation_opened', config: {} }, { id: 'assign', type: 'action.assign_queue', config: { queueId: 'q' } }], edges: [{ from: 'start', to: 'assign', port: 'next' }] };

test('setup activation failure rolls back to validated state', async () => {
  const state = createSetupStateMachine({ bootstrapSecret: 'secret', activate: async () => { throw new Error('injected'); } });
  state.transition('bootstrap', { secret: 'secret' });
  state.setDraftConfig({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's' } });
  state.validateDraft();
  await assert.rejects(state.transition('activate'), /injected/);
  assert.equal(state.getState(), 'validated');
});

test('automation publish rejects stale revision without mutating published version', () => {
  const editor = createAutomationEditor();
  const draft = editor.createDraft({ tenantId: 'tenant-a', name: 'Rule', graph });
  assert.throws(() => editor.publish({ tenantId: 'tenant-a', id: draft.id, expectedRevision: 2 }), /REVISION_CONFLICT/);
  const published = editor.publish({ tenantId: 'tenant-a', id: draft.id, expectedRevision: 1 });
  assert.equal(published.version, 1);
});

test('operation runner fails closed when an operation is already processing', async () => {
  const client = { async query(sql) {
    if (sql.includes('insert into operational_idempotency_keys')) return { rowCount: 0, rows: [] };
    return { rowCount: 1, rows: [{ request_hash: require('../modules/shared/idempotency-service').requestFingerprint({}), status: 'processing', response_body: null }] };
  } };
  const runner = createOperationRunner({ withTransaction: async fn => fn(client) });
  await assert.rejects(runner.run({ tenantId: 'tenant-a', actorId: 'admin-a', key: 'k', operation: 'queues:drain', request: {} }, async () => ({ ok: true })), /OPERATION_IN_PROGRESS/);
});

test('realtime automation replay remains idempotent after a duplicate event', async () => {
  const executed = new Set();
  let effects = 0;
  const rule = { id: 'r', tenantId: 'tenant-a', version: 1, status: 'active', trigger: 'conversation.opened', conditions: [], actions: [{ type: 'assign_queue' }] };
  const event = { id: 'e', tenantId: 'tenant-a', type: 'conversation.opened', data: {} };
  await executeRule({ rule, event, executed, handlers: { assign_queue: async () => { effects += 1; } } });
  const replay = await executeRule({ rule, event, executed, handlers: { assign_queue: async () => { effects += 1; } } });
  assert.equal(replay.status, 'duplicate');
  assert.equal(effects, 1);
});