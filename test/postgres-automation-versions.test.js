const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { provisionTestDatabase } = require('./helpers/postgres-test-database');
const { foundationMigration, operationalExperienceMigration } = require('../domain-schema');
const { canonicalGraphHash } = require('../modules/automation/graph-schema');

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DATABASE_ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !TEST_DATABASE_URL && !TEST_DATABASE_ADMIN_URL;

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const USER_ID = 'automation-manager';
const AUTOMATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const RULE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

function graph(nodeSuffix = 'assign') {
  return {
    nodes: [
      { id: 'start', type: 'trigger.conversation_opened', config: {} },
      { id: nodeSuffix, type: 'action.assign_queue', config: { queueId: 'queue-a' } },
    ],
    edges: [{ from: 'start', to: nodeSuffix, port: 'next' }],
  };
}

async function setup(pool) {
  await pool.query('create extension if not exists pgcrypto');
  await pool.query(`create table users(
    id text primary key,
    login text unique,
    email text unique,
    name text,
    role text not null default 'agent',
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await pool.query(`create table conversations(
    id text primary key,
    contact_name text not null default 'contact',
    contact_phone text,
    status text not null default 'open',
    channel text not null default 'manual',
    last_message_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await pool.query(`create table conversation_messages(
    id text primary key,
    conversation_id text not null references conversations(id) on delete cascade,
    direction text not null default 'inbound',
    body text not null default '',
    provider_message_id text,
    created_at timestamptz not null default now()
  )`);
  await pool.query(foundationMigration());
  await pool.query('insert into tenants(id,name,slug) values($1,$2,$3),($4,$5,$6) on conflict do nothing', [TENANT_A, 'Tenant A', 'tenant-a', TENANT_B, 'Tenant B', 'tenant-b']);
  await pool.query('insert into users(id,login,email,name,role) values($1,$2,$3,$4,$5) on conflict do nothing', [USER_ID, 'automation-manager', 'automation@example.test', 'Automation Manager', 'manager']);
  await pool.query(operationalExperienceMigration());
}

async function assertRejectsQuery(pool, sql, values, pattern) {
  await assert.rejects(() => pool.query(sql, values), pattern);
}

test('PostgreSQL automation drafts enforce tenant-scoped CAS and stale writes do not overwrite', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_automation_versions_cas' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await setup(pool);
    const firstGraph = graph('assign');
    const secondGraph = graph('handoff');
    await pool.query(
      `insert into automation_drafts(tenant_id, automation_id, name, graph, revision, fingerprint)
       values($1,$2,$3,$4,1,$5)`,
      [TENANT_A, AUTOMATION_ID, 'Route inbound', firstGraph, canonicalGraphHash(firstGraph)],
    );

    const revised = await pool.query(
      `update automation_drafts
       set graph=$4, fingerprint=$5, revision=revision+1, updated_at=now()
       where tenant_id=$1 and automation_id=$2 and revision=$3 and status='draft'
       returning revision, fingerprint`,
      [TENANT_A, AUTOMATION_ID, 1, secondGraph, canonicalGraphHash(secondGraph)],
    );
    assert.equal(revised.rowCount, 1);
    assert.equal(revised.rows[0].revision, 2);

    const stale = await pool.query(
      `update automation_drafts
       set graph=$4, fingerprint=$5, revision=revision+1, updated_at=now()
       where tenant_id=$1 and automation_id=$2 and revision=$3 and status='draft'
       returning revision`,
      [TENANT_A, AUTOMATION_ID, 1, firstGraph, canonicalGraphHash(firstGraph)],
    );
    assert.equal(stale.rowCount, 0);

    const crossTenant = await pool.query('select 1 from automation_drafts where tenant_id=$1 and automation_id=$2', [TENANT_B, AUTOMATION_ID]);
    assert.equal(crossTenant.rowCount, 0);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('PostgreSQL automation versions are append-only and execution pins the exact published version', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_automation_versions_pin' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await setup(pool);
    const firstGraph = graph('assign');
    const secondGraph = graph('handoff');
    await pool.query(
      `insert into automation_rules(id, tenant_id, name, trigger_type, conditions, actions, active, version, created_by)
       values($1,$2,'Route inbound','conversation.opened','{}','[]',true,1,$3)`,
      [RULE_ID, TENANT_A, USER_ID],
    );
    const v1 = await pool.query(
      `insert into automation_versions(tenant_id, automation_id, version, graph, fingerprint, published_by)
       values($1,$2,1,$3,$4,$5) returning id, version, fingerprint`,
      [TENANT_A, AUTOMATION_ID, firstGraph, canonicalGraphHash(firstGraph), USER_ID],
    );
    const run = await pool.query(
      `insert into automation_runs(id, rule_id, status, result, automation_version_id)
       values(gen_random_uuid(), $1, 'completed', $2, $3)
       returning automation_version_id`,
      [RULE_ID, { automationId: AUTOMATION_ID, version: 1, fingerprint: v1.rows[0].fingerprint }, v1.rows[0].id],
    );
    const v2 = await pool.query(
      `insert into automation_versions(tenant_id, automation_id, version, graph, fingerprint, published_by)
       values($1,$2,2,$3,$4,$5) returning id, version`,
      [TENANT_A, AUTOMATION_ID, secondGraph, canonicalGraphHash(secondGraph), USER_ID],
    );

    assert.notEqual(v1.rows[0].id, v2.rows[0].id);
    assert.equal(run.rows[0].automation_version_id, v1.rows[0].id);
    const pinned = await pool.query(
      `select av.version, av.fingerprint
       from automation_runs ar join automation_versions av on av.id = ar.automation_version_id
       where ar.automation_version_id=$1`,
      [v1.rows[0].id],
    );
    assert.deepEqual(pinned.rows[0], { version: 1, fingerprint: v1.rows[0].fingerprint });

    await assertRejectsQuery(pool, 'update automation_versions set fingerprint=$1 where id=$2', ['tampered', v1.rows[0].id], /immutable|append-only/i);
    await assertRejectsQuery(pool, 'delete from automation_versions where id=$1', [v1.rows[0].id], /immutable|append-only/i);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});
