const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');

test('operational scripts aggregate feature and every PostgreSQL-real suite fail closed', () => {
  const packageJson = require('../package.json');
  assert.equal(packageJson.scripts['test:operational'], 'node --test test/acceptance-gate.test.js test/acceptance-helpers.test.js');
  assert.equal(packageJson.scripts['test:postgres'], 'node scripts/run-postgres-tests.mjs');
  const runner = require('node:fs').readFileSync(path.join(root, 'scripts/run-postgres-tests.mjs'), 'utf8');
  assert.match(runner, /postgres-\*\.test\.js/);
  assert.match(runner, /TEST_DATABASE_URL/);
  assert.match(runner, /--test/);
});

test('operational PostgreSQL helper provides tenant-aware cleanup with schema-qualified allowlists', async () => {
  const { buildTenantCleanupStatements } = require('./helpers/operational-experience-database');
  assert.deepEqual(
    buildTenantCleanupStatements('11111111-1111-4111-8111-111111111111', ['public.contacts', 'public.conversations']),
    [
      { text: 'delete from "public"."contacts" where tenant_id = $1', values: ['11111111-1111-4111-8111-111111111111'] },
      { text: 'delete from "public"."conversations" where tenant_id = $1', values: ['11111111-1111-4111-8111-111111111111'] },
    ],
  );
  assert.throws(() => buildTenantCleanupStatements('tenant-a', ['contacts; drop table users']), /invalid cleanup table/i);
});

test('operational auth helper builds independent tenant-scoped users and sessions', () => {
  const { createOperationalPrincipals } = require('./helpers/operational-experience-auth');
  const principals = createOperationalPrincipals();
  assert.notEqual(principals.tenantA.id, principals.tenantB.id);
  assert.notEqual(principals.adminA.sessionId, principals.adminB.sessionId);
  assert.equal(principals.adminA.activeTenantId, principals.tenantA.id);
  assert.equal(principals.adminB.activeTenantId, principals.tenantB.id);
  assert.equal(principals.denied.activeTenantId, null);
});

test('operational browser fixture provisions two tenants and records bounded metrics', () => {
  const { createBrowserJourneyFixture } = require('./helpers/operational-experience-browser');
  const fixture = createBrowserJourneyFixture();
  fixture.recordMetric('realtime-visible-ms', 1250, { tenantId: fixture.tenants.a.id });
  assert.notEqual(fixture.tenants.a.id, fixture.tenants.b.id);
  assert.equal(fixture.metrics[0].name, 'realtime-visible-ms');
  assert.equal(fixture.metrics[0].value, 1250);
  assert.throws(() => fixture.recordMetric('bad', Number.NaN), /finite non-negative/i);
});

test('secret leak helper finds canaries without echoing their values', () => {
  const { assertNoSecretLeaks } = require('./helpers/secret-leak-assertions');
  const secret = ['runtime', 'canary', 'do-not-print'].join('-');
  assert.doesNotThrow(() => assertNoSecretLeaks(secret, ['masked: ********']));
  assert.throws(
    () => assertNoSecretLeaks(secret, [{ stdout: `prefix ${secret} suffix` }]),
    error => error.code === 'SECRET_LEAK_DETECTED' && !error.message.includes(secret) && /stdout/.test(error.message),
  );
});

test('PostgreSQL helper fails closed when no real database connection is configured', () => {
  const execution = spawnSync(process.execPath, ['-e', `
    delete process.env.TEST_DATABASE_URL;
    delete process.env.TEST_DATABASE_ADMIN_URL;
    const { configuredConnection } = require('./test/helpers/postgres-test-database');
    configuredConnection();
  `], { cwd: root, encoding: 'utf8', env: { ...process.env, TEST_DATABASE_URL: '', TEST_DATABASE_ADMIN_URL: '' } });
  assert.notEqual(execution.status, 0);
  assert.match(execution.stderr, /TEST_DATABASE_URL or TEST_DATABASE_ADMIN_URL is required/);
});

test('authenticated app helper serves an authenticated tenant-scoped route', async () => {
  const { withAuthenticatedApp } = require('./helpers/authenticated-app');
  await withAuthenticatedApp(async ({ request }) => {
    const response = await request('/dashboard');
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Visão geral|Dashboard/i);
  });
});

test('browser fixture loads Playwright and the system Chromium when the mandatory browser gate is installed', async () => {
  const { chromiumExecutable, loadPlaywright } = require('./helpers/browser-fixture');
  assert.match(chromiumExecutable(), /chromium/);
  const playwright = await loadPlaywright();
  assert.equal(typeof playwright.chromium.launch, 'function');
});

test('tenant matrix deliberately collides natural identifiers across tenants', () => {
  const { tenantMatrix, TENANT_A, TENANT_B } = require('./fixtures/tenant-matrix');
  assert.notEqual(TENANT_A, TENANT_B);
  assert.equal(tenantMatrix.contacts[0].phone, tenantMatrix.contacts[1].phone);
  assert.equal(tenantMatrix.contacts[0].externalId, tenantMatrix.contacts[1].externalId);
  assert.equal(tenantMatrix.tags[0].name, tenantMatrix.tags[1].name);
  assert.notEqual(tenantMatrix.contacts[0].tenantId, tenantMatrix.contacts[1].tenantId);
});
