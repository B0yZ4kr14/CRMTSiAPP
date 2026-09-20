const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { provisionTestDatabase } = require('./helpers/postgres-test-database');
const { foundationMigration, operationalExperienceMigration } = require('../domain-schema');
const { canonicalFingerprint } = require('../modules/marketing/campaign-service');

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DATABASE_ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !TEST_DATABASE_URL && !TEST_DATABASE_ADMIN_URL;

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const USER_ID = 'campaign-manager';
const CAMPAIGN_ID = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';

function content(text = 'Olá {{contact.name}}') {
  return { blocks: [{ type: 'paragraph', text, marks: [] }] };
}

function fingerprint(channel, body, capabilityProfileVersion = 1) {
  return canonicalFingerprint({ channel, content: body, capabilityProfileVersion });
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
  await pool.query('insert into users(id,login,email,name,role) values($1,$2,$3,$4,$5) on conflict do nothing', [USER_ID, 'campaign-manager', 'campaign@example.test', 'Campaign Manager', 'manager']);
  await pool.query(operationalExperienceMigration());
}

async function assertRejectsQuery(pool, sql, values, pattern) {
  await assert.rejects(() => pool.query(sql, values), pattern);
}

test('PostgreSQL campaign drafts enforce tenant-scoped CAS and canonical fingerprint changes', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_campaign_versions_cas' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await setup(pool);
    const firstContent = content('Olá {{contact.name}}');
    const secondContent = content('Bem-vindo {{contact.name}}');
    await pool.query(
      `insert into campaign_drafts(tenant_id, campaign_id, name, channel, content, capability_profile_version, revision, fingerprint)
       values($1,$2,$3,'waha',$4,1,1,$5)`,
      [TENANT_A, CAMPAIGN_ID, 'Boas-vindas', firstContent, fingerprint('waha', firstContent)],
    );

    const revised = await pool.query(
      `update campaign_drafts
       set content=$4, fingerprint=$5, revision=revision+1, updated_at=now()
       where tenant_id=$1 and campaign_id=$2 and revision=$3 and status='draft'
       returning revision, fingerprint`,
      [TENANT_A, CAMPAIGN_ID, 1, secondContent, fingerprint('waha', secondContent)],
    );
    assert.equal(revised.rowCount, 1);
    assert.equal(revised.rows[0].revision, 2);
    assert.notEqual(revised.rows[0].fingerprint, fingerprint('waha', firstContent));

    const stale = await pool.query(
      `update campaign_drafts
       set content=$4, fingerprint=$5, revision=revision+1, updated_at=now()
       where tenant_id=$1 and campaign_id=$2 and revision=$3 and status='draft'
       returning revision`,
      [TENANT_A, CAMPAIGN_ID, 1, firstContent, fingerprint('waha', firstContent)],
    );
    assert.equal(stale.rowCount, 0);

    const crossTenant = await pool.query('select 1 from campaign_drafts where tenant_id=$1 and campaign_id=$2', [TENANT_B, CAMPAIGN_ID]);
    assert.equal(crossTenant.rowCount, 0);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});

test('PostgreSQL campaign versions are immutable and dispatch jobs pin version and fingerprint', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_campaign_versions_pin' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await setup(pool);
    const firstContent = content('Olá {{contact.name}}');
    const secondContent = content('Última chamada {{contact.name}}');
    const v1 = await pool.query(
      `insert into campaign_versions(tenant_id, campaign_id, version, channel, content, capability_profile_version, fingerprint, published_by)
       values($1,$2,1,'waha',$3,1,$4,$5) returning id, version, fingerprint, capability_profile_version`,
      [TENANT_A, CAMPAIGN_ID, firstContent, fingerprint('waha', firstContent), USER_ID],
    );
    const job = await pool.query(
      `insert into outbox_jobs(id, kind, payload, idempotency_key, campaign_version_id)
       values(gen_random_uuid(), 'campaign', $1, $2, $3)
       returning campaign_version_id, payload`,
      [{ campaignId: CAMPAIGN_ID, version: 1, fingerprint: v1.rows[0].fingerprint, capabilityProfileVersion: 1 }, 'campaign-v1-send', v1.rows[0].id],
    );
    const v2 = await pool.query(
      `insert into campaign_versions(tenant_id, campaign_id, version, channel, content, capability_profile_version, fingerprint, published_by)
       values($1,$2,2,'waha',$3,1,$4,$5) returning id, version, fingerprint`,
      [TENANT_A, CAMPAIGN_ID, secondContent, fingerprint('waha', secondContent), USER_ID],
    );

    assert.notEqual(v1.rows[0].id, v2.rows[0].id);
    assert.equal(job.rows[0].campaign_version_id, v1.rows[0].id);
    assert.deepEqual(job.rows[0].payload, {
      campaignId: CAMPAIGN_ID,
      version: 1,
      fingerprint: v1.rows[0].fingerprint,
      capabilityProfileVersion: 1,
    });

    const pinned = await pool.query(
      `select cv.version, cv.fingerprint, cv.capability_profile_version
       from outbox_jobs oj join campaign_versions cv on cv.id = oj.campaign_version_id
       where oj.campaign_version_id=$1`,
      [v1.rows[0].id],
    );
    assert.deepEqual(pinned.rows[0], { version: 1, fingerprint: v1.rows[0].fingerprint, capability_profile_version: 1 });

    await assertRejectsQuery(pool, 'update campaign_versions set fingerprint=$1 where id=$2', ['tampered', v1.rows[0].id], /immutable|append-only/i);
    await assertRejectsQuery(pool, 'delete from campaign_versions where id=$1', [v1.rows[0].id], /immutable|append-only/i);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});
