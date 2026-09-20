const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const schema = fs.readFileSync(path.join(__dirname, '..', 'domain-schema.js'), 'utf8');

for (const table of ['contacts', 'leads', 'companies', 'teams', 'queues', 'templates']) {
  test(`${table} receives tenant ownership in schema migration`, () => {
    assert.match(schema, new RegExp(`alter table ${table} add column if not exists tenant_id uuid`));
    assert.match(schema, new RegExp(`update ${table} set tenant_id='\\$\\{DEFAULT_TENANT_ID\\}' where tenant_id is null`));
  });
}

test('core CRM list and create routes scope contacts and leads by active tenant', () => {
  assert.match(server, /from contacts where tenant_id=\$1 order by created_at desc limit 100/);
  assert.match(server, /insert into contacts\(tenant_id,name,email,phone\) values\(\$1,\$2,\$3,\$4\)/);
  assert.match(server, /from leads where tenant_id=\$1 order by created_at desc limit 100/);
  assert.match(server, /insert into leads\(tenant_id,title,status,value_cents,source,owner_id\) values\(\$1,\$2,'novo',\$3,\$4,\$5\)/);
});

test('connections route loads channels for the active tenant', () => {
  assert.match(server, /renderWorkspace\('connections',\{channels:await listChannels\(user\.tenantId\)/);
});

test('settings collections are tenant scoped on read and create', () => {
  assert.match(server, /from teams t left join team_members tm on tm.team_id=t.id where t.tenant_id=\$1/);
  assert.match(server, /from queues where tenant_id=\$1 order by name/);
  assert.match(server, /from templates where tenant_id=\$1 order by created_at desc limit 100/);
  assert.match(server, /insert into teams\(id,tenant_id,name\) values\(\$1,\$2,\$3\)/);
});

test('persisted roles are scoped to the active tenant and legacy roles do not leak into other tenants', () => {
  assert.match(schema, /alter table user_roles add column if not exists tenant_id uuid references tenants\(id\) on delete cascade/);
  assert.match(schema, /alter table user_roles add constraint user_roles_tenant_user_role_key primary key\(tenant_id,user_id,role_name\)/);
  assert.match(server, /left join user_roles ur on ur.user_id=u.id and ur.tenant_id=s.active_tenant_id/);
  assert.match(server, /legacyRole:tenantId===DEFAULT_TENANT_ID\?row.role:null/);
});

test('queue names are unique within a tenant rather than globally', () => {
  assert.match(schema, /alter table queues drop constraint if exists queues_name_key/);
  assert.match(schema, /create unique index if not exists queues_tenant_name_key on queues\(tenant_id,name\)/);
});
