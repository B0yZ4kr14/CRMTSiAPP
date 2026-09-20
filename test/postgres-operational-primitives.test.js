const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');

const { provisionTestDatabase } = require('./helpers/postgres-test-database');
const { operationalExperienceMigration } = require('../domain-schema');
const { createOperationContext } = require('../modules/shared/operation-context');
const { evaluatePolicy, requireScope } = require('../modules/identity/authorization-service');
const { claimIdempotency, resolveIdempotency } = require('../modules/shared/idempotency-service');

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

async function createOperationalSchema(pool) {
  await pool.query('create table tenants(id uuid primary key)');
  await pool.query('insert into tenants(id) values($1),($2)', [TENANT_A, TENANT_B]);
  await pool.query(operationalExperienceMigration());
}

test('authorization requires capability and enforces tenant scope', () => {
  const context = createOperationContext({
    tenantId: TENANT_A,
    actorId: 'actor-a',
    capabilities: ['provider:read'],
    requestId: 'request-a',
  });

  assert.equal(evaluatePolicy(context, 'provider:read', { tenantId: TENANT_A }), true);
  assert.equal(evaluatePolicy(context, 'provider:manage', { tenantId: TENANT_A }), false);
  assert.equal(evaluatePolicy(context, 'provider:read', { tenantId: TENANT_B }), false);
  assert.throws(() => requireScope(context, 'provider:read', { tenantId: TENANT_B }), error => error.code === 'FORBIDDEN');
});

const connectionString = process.env.TEST_DATABASE_URL;
const adminConnectionString = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !connectionString && !adminConnectionString;

test('idempotency keys are tenant-scoped, replay completed results, and reject changed input', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_idempotency' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await createOperationalSchema(pool);
    const input = { tenantId: TENANT_A, key: 'key-1', operation: 'provider.save', request: { provider: 'openai' } };
    const first = await claimIdempotency(pool, input);
    assert.equal(first.claimed, true);

    await resolveIdempotency(pool, {
      tenantId: TENANT_A,
      key: 'key-1',
      operation: 'provider.save',
      responseStatus: 201,
      responseBody: { id: 'provider-1' },
    });

    const replay = await claimIdempotency(pool, input);
    assert.equal(replay.claimed, false);
    assert.equal(replay.record.status, 'completed');
    assert.equal(replay.record.response_status, 201);
    assert.deepEqual(replay.record.response_body, { id: 'provider-1' });

    const otherTenant = await claimIdempotency(pool, { ...input, tenantId: TENANT_B });
    assert.equal(otherTenant.claimed, true);

    await assert.rejects(
      claimIdempotency(pool, { ...input, request: { provider: 'anthropic' } }),
      error => error.code === 'IDEMPOTENCY_CONFLICT',
    );
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});
