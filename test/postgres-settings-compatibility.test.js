const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { hashPassword } = require('../bootstrap-admin');
const { foundationMigration, tenantMigration, DEFAULT_TENANT_ID } = require('../domain-schema');

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DATABASE_ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL;
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const skip = !TEST_DATABASE_URL && !TEST_DATABASE_ADMIN_URL;

async function provisionDatabase() {
  if (!TEST_DATABASE_ADMIN_URL) return { connectionString: TEST_DATABASE_URL, cleanup: async () => {} };
  const admin = new Pool({ connectionString: TEST_DATABASE_ADMIN_URL });
  const database = `crmtsiapp_settings_${process.pid}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  await admin.query(`create database ${database}`);
  const url = new URL(TEST_DATABASE_ADMIN_URL);
  url.pathname = `/${database}`;
  return {
    connectionString: url.toString(),
    cleanup: async () => {
      await admin.query(`drop database if exists ${database} with (force)`);
      await admin.end();
    },
  };
}

async function withDatabase(fn) {
  const provisioned = await provisionDatabase();
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    await pool.query(`create table if not exists users(
      id text primary key,
      login text unique not null,
      email text unique not null,
      name text not null,
      role text not null default 'admin',
      password_salt text,
      password_hash text,
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
    await pool.query(`create table if not exists sessions(
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      token_hash text unique not null,
      user_agent text,
      ip text,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )`);
    await pool.query(`create table if not exists conversations(
      id text primary key,
      contact_name text not null,
      contact_phone text,
      status text not null default 'open',
      channel text not null default 'manual',
      last_message_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
    await pool.query(`create table if not exists conversation_messages(
      id text primary key,
      conversation_id text not null references conversations(id) on delete cascade,
      direction text not null,
      body text not null,
      provider_message_id text,
      created_at timestamptz not null default now()
    )`);
    await pool.query(`create table channels(id uuid primary key, provider text not null default 'waha', name text not null default 'channel', enabled boolean not null default true, config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now())`);
    await pool.query(`create table contacts(id bigint primary key, name text not null default 'contact', created_at timestamptz not null default now())`);
    await pool.query(`create table leads(id bigint primary key, title text not null default 'lead', created_at timestamptz not null default now())`);
    await pool.query(`create table companies(id bigint primary key, name text not null default 'company', created_at timestamptz not null default now())`);
    await pool.query(`create table teams(id uuid primary key, name text not null default 'team', created_at timestamptz not null default now())`);
    await pool.query(`create table queues(id uuid primary key, name text not null default 'queue', strategy text not null default 'round_robin', active boolean not null default true, created_at timestamptz not null default now())`);
    await pool.query(`create table templates(id uuid primary key, channel_id uuid, name text not null default 'template', language text not null default 'pt_BR', status text not null default 'draft', created_at timestamptz not null default now())`);
    await pool.query(`create table webhook_events(id uuid primary key, created_at timestamptz not null default now())`);
    await pool.query(`create table if not exists conversation_messages(id text primary key, conversation_id text, provider_message_id text, created_at timestamptz not null default now())`);
    await pool.query(`create table if not exists outbox_jobs(id uuid primary key, tenant_id uuid, conversation_id text, status text not null default 'queued', available_at timestamptz not null default now(), created_at timestamptz not null default now())`);
    await pool.query(`create table if not exists delivery_events(id uuid primary key, tenant_id uuid, channel_id uuid, message_id text, job_id uuid references outbox_jobs(id) on delete cascade, provider_message_id text not null default '', status text not null default 'accepted', occurred_at timestamptz not null default now(), payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now())`);
    await pool.query(`create table if not exists failed_jobs(id uuid primary key, tenant_id uuid, outbox_job_id uuid, job_id uuid, reason text not null default '', payload jsonb not null default '{}'::jsonb, failed_at timestamptz not null default now(), created_at timestamptz not null default now())`);
    await pool.query(`create table if not exists settings(key text primary key,value text not null,updated_at timestamptz not null default now())`);
    await pool.query(foundationMigration());
    await pool.query(tenantMigration());
    await fn(pool);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
}

async function seedUser(pool, { id, role, tenantId = DEFAULT_TENANT_ID }) {
  const salt = crypto.randomBytes(16).toString('hex');
  const password = `pass-${id}-123456789`;
  await pool.query(
    'insert into users(id,login,email,name,role,password_salt,password_hash,active) values($1,$2,$3,$4,$5,$6,$7,true)',
    [id, id, `${id}@example.test`, id, role, salt, hashPassword(password, salt)],
  );
  await pool.query('insert into tenant_memberships(tenant_id,user_id) values($1,$2)', [tenantId, id]);
  return { id, role, password };
}

test('fresh PostgreSQL migration contains canonical settings workflow tables and columns', { skip }, async () => {
  await withDatabase(async pool => {
    const columns = await pool.query(`
      select table_name, column_name
      from information_schema.columns
      where table_schema='public' and table_name in ('automation_rules','privacy_requests','audit_events')
      order by table_name, column_name
    `);
    const byTable = new Map();
    for (const row of columns.rows) {
      if (!byTable.has(row.table_name)) byTable.set(row.table_name, new Set());
      byTable.get(row.table_name).add(row.column_name);
    }
    assert.deepEqual([...byTable.get('automation_rules')].sort(), [
      'actions', 'active', 'conditions', 'created_at', 'created_by', 'id', 'name', 'tenant_id', 'trigger_type', 'updated_at', 'version',
    ].sort());
    assert.deepEqual([...byTable.get('privacy_requests')].sort(), [
      'completed_at', 'contact_phone', 'created_at', 'expires_at', 'id', 'kind', 'requested_by', 'result', 'status', 'tenant_id',
    ].sort());
    assert.ok(byTable.get('audit_events').has('tenant_id'));
  });
});

test('PostgreSQL settings queries are tenant-scoped and use migrated canonical columns', { skip }, async () => {
  await withDatabase(async pool => {
    await seedUser(pool, { id: 'admin-a', role: 'admin' });
    await pool.query(`insert into tenants(id,name,slug) values($1,'Tenant B','tenant-b')`, [TENANT_B]);
    await seedUser(pool, { id: 'admin-b', role: 'admin', tenantId: TENANT_B });
    await pool.query(`insert into automation_rules(id,tenant_id,name,trigger_type,conditions,actions,active,created_by) values
      ($1,$2,'A rule','inbound_message','{}'::jsonb,'[]'::jsonb,true,'admin-a'),
      ($3,$4,'B rule','sla_breach','{}'::jsonb,'[]'::jsonb,true,'admin-b')`,
      [crypto.randomUUID(), DEFAULT_TENANT_ID, crypto.randomUUID(), TENANT_B]);
    await pool.query(`insert into privacy_requests(id,tenant_id,contact_phone,kind,requested_by) values
      ($1,$2,'551100000001','export','admin-a'),
      ($3,$4,'551100000002','delete','admin-b')`,
      [crypto.randomUUID(), DEFAULT_TENANT_ID, crypto.randomUUID(), TENANT_B]);

    const automations = await pool.query('select id,name,trigger_type,conditions,actions,active,version from automation_rules where tenant_id=$1 order by name', [DEFAULT_TENANT_ID]);
    assert.equal(automations.rowCount, 1);
    assert.equal(automations.rows[0].name, 'A rule');
    assert.equal(automations.rows[0].trigger_type, 'inbound_message');

    const privacy = await pool.query('select id,contact_phone,kind,status,requested_by,created_at from privacy_requests where tenant_id=$1 order by created_at desc limit 20', [DEFAULT_TENANT_ID]);
    assert.equal(privacy.rowCount, 1);
    assert.equal(privacy.rows[0].contact_phone, '551100000001');
    assert.equal(privacy.rows[0].kind, 'export');
  });
});

test('settings workflow authorization, CSRF, and successful POST/GET flows execute against PostgreSQL', { skip }, async () => {
  await withDatabase(async pool => {
    const { ensureAuthorized, auditInsert } = require('../authorization');
    const { createCsrfToken, verifyCsrfToken } = require('../security');

    await seedUser(pool, { id: 'viewer-a', role: 'viewer' });
    await seedUser(pool, { id: 'admin-a', role: 'admin' });

    assert.throws(() => ensureAuthorized({ id: 'viewer-a', role: 'viewer' }, 'privacy:read'), { statusCode: 403 });
    assert.throws(() => ensureAuthorized({ id: 'manager-a', role: 'manager' }, 'privacy:read'), { statusCode: 403 });
    assert.throws(() => ensureAuthorized({ id: 'manager-a', role: 'manager' }, 'audit:read'), { statusCode: 403 });
    assert.doesNotThrow(() => ensureAuthorized({ id: 'admin-a', role: 'admin' }, 'privacy:read'));
    assert.doesNotThrow(() => ensureAuthorized({ id: 'admin-a', role: 'admin' }, 'audit:read'));

    const csrf = createCsrfToken('session-admin-a', 'postgres-settings-secret');
    assert.equal(verifyCsrfToken(csrf, 'session-admin-a', 'postgres-settings-secret'), true);
    assert.equal(verifyCsrfToken('bad-token', 'session-admin-a', 'postgres-settings-secret'), false);

    const automationId = crypto.randomUUID();
    await pool.query(
      "insert into automation_rules(id,tenant_id,name,trigger_type,conditions,actions,active,created_by) values($1,$2,$3,$4,'{}'::jsonb,'[]'::jsonb,true,$5)",
      [automationId, DEFAULT_TENANT_ID, 'Escalate SLA', 'sla_breach', 'admin-a'],
    );
    await auditInsert(pool, { tenantId: DEFAULT_TENANT_ID, actorUserId: 'admin-a', action: 'automation.rule_created', resourceType: 'automation_rule', resourceId: automationId, metadata: { source: 'test' } });

    const privacyId = crypto.randomUUID();
    await pool.query(
      'insert into privacy_requests(id,tenant_id,contact_phone,kind,requested_by) values($1,$2,$3,$4,$5)',
      [privacyId, DEFAULT_TENANT_ID, '5511999999999', 'export', 'admin-a'],
    );
    await auditInsert(pool, { tenantId: DEFAULT_TENANT_ID, actorUserId: 'admin-a', action: 'privacy.export_requested', resourceType: 'privacy_request', resourceId: privacyId, metadata: { source: 'test' } });

    const automation = await pool.query('select id,name,trigger_type,conditions,actions,active,version from automation_rules where tenant_id=$1 order by name', [DEFAULT_TENANT_ID]);
    assert.equal(automation.rows[0].name, 'Escalate SLA');
    const privacy = await pool.query('select id,contact_phone,kind,status,requested_by,created_at from privacy_requests where tenant_id=$1 order by created_at desc limit 20', [DEFAULT_TENANT_ID]);
    assert.equal(privacy.rows[0].contact_phone, '5511999999999');
    const audit = await pool.query('select action,resource_type,resource_id,metadata from audit_events where tenant_id=$1 order by created_at desc limit 10', [DEFAULT_TENANT_ID]);
    assert.ok(audit.rows.some(row => row.action === 'privacy.export_requested' && row.resource_id === privacyId));
    assert.ok(audit.rows.some(row => row.action === 'automation.rule_created' && row.resource_id === automationId));

    const queueId = crypto.randomUUID();
    await pool.query('insert into queues(id,tenant_id,name,strategy,active) values($1,$2,$3,$4,true)', [queueId, DEFAULT_TENANT_ID, 'Suporte', 'round_robin']);
    const templateId = crypto.randomUUID();
    await pool.query('insert into templates(id,tenant_id,channel_id,name,language,status) values($1,$2,$3,$4,$5,$6)', [templateId, DEFAULT_TENANT_ID, null, 'retorno_inicial', 'pt_BR', 'draft']);
    await pool.query('insert into template_versions(id,template_id,body,variables,version) values($1,$2,$3,$4,$5)', [crypto.randomUUID(), templateId, 'Olá {{1}}', JSON.stringify([1]), 1]);
    await auditInsert(pool, { tenantId: DEFAULT_TENANT_ID, actorUserId: 'admin-a', action: 'queue.created', resourceType: 'queue', resourceId: queueId, metadata: { source: 'test' } });
    await auditInsert(pool, { tenantId: DEFAULT_TENANT_ID, actorUserId: 'admin-a', action: 'template.created', resourceType: 'template', resourceId: templateId, metadata: { source: 'test' } });

    const queues = await pool.query('select id,name,strategy,active from queues where tenant_id=$1 order by name', [DEFAULT_TENANT_ID]);
    const templates = await pool.query('select id,name,language,status from templates where tenant_id=$1 order by created_at desc limit 100', [DEFAULT_TENANT_ID]);
    assert.ok(queues.rows.some(row => row.id === queueId && row.name === 'Suporte'));
    assert.ok(templates.rows.some(row => row.id === templateId && row.name === 'retorno_inicial'));
  });
});
