const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { createSetupStateMachine } = require('../modules/setup/state-machine');

test('setup state machine rejects direct tenant injection from payload', () => {
  const sm = createSetupStateMachine();
  assert.throws(() => sm.transition('bootstrap', { tenantId: 'injected' }), /TENANT_MISMATCH/);
});

test('setup state machine requires valid bootstrap secret for initial transition', () => {
  const sm = createSetupStateMachine({ bootstrapSecret: 'valid-secret' });
  assert.throws(() => sm.transition('bootstrap', { secret: 'wrong' }), /BOOTSTRAP_SECRET_INVALID/);
});

test('setup state machine only allows bootstrap once and seals the version', () => {
  const sm = createSetupStateMachine({ bootstrapSecret: 'secret' });
  sm.transition('bootstrap', { secret: 'secret' });
  assert.throws(() => sm.transition('bootstrap', { secret: 'secret' }), /ALREADY_BOOTSTRAPPED/);
});

test('setup state machine tracks draft config without persisting secrets', () => {
  const sm = createSetupStateMachine({ bootstrapSecret: 'secret' });
  sm.transition('bootstrap', { secret: 'secret' });
  const draft = sm.getDraft();
  assert.equal(draft.version, 1);
  assert.equal(draft.secretsHash, null);
});

test('setup state machine validates provider config against allowlisted schema', () => {
  const sm = createSetupStateMachine({ bootstrapSecret: 'secret' });
  sm.transition('bootstrap', { secret: 'secret' });
  assert.throws(() => sm.setDraftConfig({ provider: 'unknown', config: {} }), /PROVIDER_NOT_ALLOWLISTED/);
});

test('setup state machine enforces rate limit on validation attempts', () => {
  const sm = createSetupStateMachine({ bootstrapSecret: 'secret', validationRateLimit: 2 });
  sm.transition('bootstrap', { secret: 'secret' });
  sm.setDraftConfig({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } });
  sm.validateDraft();
  sm.validateDraft();
  assert.throws(() => sm.validateDraft(), /VALIDATION_RATE_EXCEEDED/);
});

test('setup state machine atomically activates validated draft and closes further mutations', async () => {
  const sm = createSetupStateMachine({ bootstrapSecret: 'secret' });
  sm.transition('bootstrap', { secret: 'secret' });
  sm.setDraftConfig({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } });
  sm.validateDraft();
  await sm.transition('activate');
  assert.equal(sm.getState(), 'active');
  assert.throws(() => sm.setDraftConfig({ provider: 'waha', config: {} }), /ACTIVATION_CLOSED/);
});

test('setup state machine rolls back on injected failure during activation', async () => {
  const sm = createSetupStateMachine({ bootstrapSecret: 'secret', activate: async () => { throw new Error('injected'); } });
  sm.transition('bootstrap', { secret: 'secret' });
  sm.setDraftConfig({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } });
  sm.validateDraft();
  await assert.rejects(sm.transition('activate'), /injected/);
  assert.equal(sm.getState(), 'validated');
});