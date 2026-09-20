const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const workspace = fs.readFileSync(path.join(__dirname, '..', 'workspace.js'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', 'migrate.js'), 'utf8');
const domainSchema = fs.readFileSync(path.join(__dirname, '..', 'domain-schema.js'), 'utf8');

test('settings loader uses the live schema contract and fetches only the selected workspace data', () => {
  assert.doesNotMatch(source, /select id,name,provider,validation_state from channels/);
  assert.doesNotMatch(source, /select id,name,trigger,active from automation_rules/);
  assert.doesNotMatch(source, /from audit_logs/);
  assert.match(source, /select id,name,trigger_type,conditions,actions,active,version from automation_rules where tenant_id=\$1/);
  assert.match(source, /select id,contact_phone,kind,status,requested_by,created_at from privacy_requests where tenant_id=\$1/);
  assert.match(source, /select id,action,resource_type,resource_id,metadata,created_at from audit_events where tenant_id=\$1/);
  assert.doesNotMatch(source, /const \[teams, channels, queues, templates, sessions\] = await Promise\.all/);
  assert.match(source, /if \(url\.pathname\.startsWith\('\/settings\/'\) && req\.method === 'GET'\)/);
});

test('migration path declares automation and privacy tables through the domain schema', () => {
  assert.match(migration, /foundationMigration\(\)/);
  assert.match(domainSchema, /create table if not exists automation_rules \(id uuid primary key, tenant_id uuid references tenants\(id\) on delete restrict, name text not null, trigger_type text not null, conditions jsonb not null default '\{\}'::jsonb, actions jsonb not null default '\[\]'::jsonb, active boolean not null default false, version integer not null default 1, created_by text references users\(id\) on delete set null, created_at timestamptz not null default now\(\), updated_at timestamptz not null default now\(\)\)/);
  assert.match(domainSchema, /create table if not exists privacy_requests \(id uuid primary key, tenant_id uuid references tenants\(id\) on delete restrict, contact_phone text not null, kind text not null check\(kind in \('export','anonymize','delete'\)\), status text not null default 'open' check\(status in \('open','processing','completed','rejected'\)\), requested_by text references users\(id\) on delete set null, result jsonb not null default '\{\}'::jsonb, expires_at timestamptz, created_at timestamptz not null default now\(\), completed_at timestamptz\)/);
});

test('privacy workspace renders persisted requests and audit events using the canonical schema', () => {
  const html = workspace.includes("state.privacyRequests") && workspace.includes("state.auditEvents");
  assert.equal(html, true);
  assert.match(workspace, /contact_phone/);
  assert.match(workspace, /auditEvents/);
});

test('catalog settings are tenant-scoped after tenant migration', () => {
  assert.match(migration, /alter table settings add column if not exists tenant_id uuid references tenants\(id\) on delete restrict/);
  assert.match(migration, /alter table settings add constraint settings_tenant_key primary key\(tenant_id,key\)/);
  assert.match(source, /select key,value from settings where tenant_id=\$1/);
  assert.match(source, /insert into settings\(tenant_id,key,value\) values\(\$1,\$2,\$3\) on conflict\(tenant_id,key\)/);
});

test('dashboard failure metric counts every actionable delivery failure state', () => {
  assert.match(source, /status in \('failed','dead_letter','delivery_unknown'\)/);
});
