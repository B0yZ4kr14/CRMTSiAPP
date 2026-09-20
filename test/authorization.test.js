const test = require('node:test');
const assert = require('node:assert/strict');
const { auditInsert, ensureAuthorized } = require('../authorization');

test('authorization guard rejects absent or insufficient roles before a mutation', () => {
  assert.throws(() => ensureAuthorized(null, 'conversation:write'), { statusCode: 403 });
  assert.throws(() => ensureAuthorized({ id: 'viewer', role: 'viewer' }, 'conversation:write'), { statusCode: 403 });
  assert.doesNotThrow(() => ensureAuthorized({ id: 'agent', role: 'agent' }, 'conversation:write'));
});

test('audit writes identify actor/action/resource without accepting caller supplied SQL', async () => {
  let captured;
  await auditInsert({ query: async (text, values) => { captured = { text, values }; } }, { tenantId: 't-1', actorUserId:'u-1', action:'conversation.created', resourceType:'conversation', resourceId:'c-1', metadata:{ source:'manual' } });
  assert.match(captured.text, /insert into audit_events/);
  assert.deepEqual(captured.values.slice(1, 6), ['t-1', 'u-1', 'conversation.created', 'conversation', 'c-1']);
  assert.equal(captured.values[6], JSON.stringify({ source:'manual' }));
});

test('audit writes reject a missing tenant instead of falling back to the default tenant', () => {
  assert.throws(
    () => auditInsert({ query: async () => {} }, { actorUserId: 'u-1', action: 'channel.created', resourceType: 'channel' }),
    /tenantId is required for audit/,
  );
});

test('channel creation and catalog updates supply the active tenant to audit writes', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(source, /auditInsert\(pool,\{tenantId:user\.tenantId,actorUserId:user\.id,action:'channel\.created'/);
  assert.match(source, /auditInsert\(pool,\{tenantId:user\.tenantId,actorUserId:user\.id,action:'setting\.updated'/);
});