const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { can } = require('../rbac');
const { ROUTE_CAPABILITIES } = require('../route-capabilities');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('privacy settings GET requires both privacy and audit read capabilities before exposing identifiers', () => {
  assert.match(source, /section === 'privacy'/);
  assert.match(source, /ROUTE_CAPABILITIES\['GET \/settings\/privacy'\]/);
  assert.match(source, /ROUTE_CAPABILITIES\['GET \/settings\/privacy\/audit'\]/);
  assert.equal(can('viewer', ROUTE_CAPABILITIES['GET /settings/privacy']), false);
  assert.equal(can('manager', ROUTE_CAPABILITIES['GET /settings/privacy']), false);
  assert.equal(can('manager', ROUTE_CAPABILITIES['GET /settings/privacy/audit']), false);
  assert.equal(can('admin', ROUTE_CAPABILITIES['GET /settings/privacy']), true);
  assert.equal(can('admin', ROUTE_CAPABILITIES['GET /settings/privacy/audit']), true);
});

test('queue and template settings mutations are CSRF-protected, tenant-scoped, and audited', () => {
  assert.match(source, /url\.pathname==='\/settings\/queues'&&req\.method==='POST'/);
  assert.match(source, /url\.pathname==='\/settings\/templates'&&req\.method==='POST'/);
  for (const route of ['POST /settings/queues', 'POST /settings/templates']) {
    const routeIndex = source.indexOf(`ROUTE_CAPABILITIES['${route}']`);
    assert.ok(routeIndex >= 0, `${route} must use its route capability`);
    const routeSource = source.slice(Math.max(0, routeIndex - 350), routeIndex + 1800);
    assert.match(routeSource, /verifyForm\(req,form,user\)/);
  }
  assert.match(source, /insert into queues\(id,tenant_id,name,strategy,active\)/);
  assert.match(source, /insert into templates\(id,tenant_id,channel_id,name,language,status\)/);
  assert.match(source, /insert into template_versions\(id,template_id,body,variables,version\)/);
  assert.match(source, /action:'queue\.created'/);
  assert.match(source, /action:'template\.created'/);
});

test('route capability map keeps every authenticated mutation behind an explicit server-side permission', () => {
  assert.equal(ROUTE_CAPABILITIES['POST /inbox'], 'conversation:write');
  assert.equal(ROUTE_CAPABILITIES['POST /inbox/:id/messages'], 'conversation:write');
  assert.equal(ROUTE_CAPABILITIES['POST /inbox/:id/status'], 'conversation:write');
  assert.equal(ROUTE_CAPABILITIES['POST /inbox/:id/assignment'], 'conversation:write');
  assert.equal(ROUTE_CAPABILITIES['POST /inbox/:id/templates'], 'conversation:write');
  assert.equal(ROUTE_CAPABILITIES['POST /settings/channels'], 'settings:write');
  assert.equal(ROUTE_CAPABILITIES['POST /settings/team'], 'team:manage');
  assert.equal(ROUTE_CAPABILITIES['POST /settings/queues'], 'queue:manage');
  assert.equal(ROUTE_CAPABILITIES['POST /settings/templates'], 'template:manage');
  assert.equal(ROUTE_CAPABILITIES['POST /settings/automation'], 'automation:manage');
  assert.equal(ROUTE_CAPABILITIES['POST /settings/privacy'], 'privacy:manage');
  assert.equal(ROUTE_CAPABILITIES['GET /settings/privacy'], 'privacy:read');
  assert.equal(ROUTE_CAPABILITIES['GET /settings/privacy/audit'], 'audit:read');
  assert.equal(can('agent', ROUTE_CAPABILITIES['POST /settings/channels']), false);
  assert.equal(can('viewer', ROUTE_CAPABILITIES['GET /settings/privacy']), false);
  assert.equal(can('manager', ROUTE_CAPABILITIES['GET /settings/privacy']), false);
  assert.equal(can('manager', ROUTE_CAPABILITIES['GET /settings/privacy/audit']), false);
  assert.equal(can('admin', ROUTE_CAPABILITIES['GET /settings/privacy']), true);
  assert.equal(can('admin', ROUTE_CAPABILITIES['GET /settings/privacy/audit']), true);
});

test('queue and template settings mutations are CSRF-protected, tenant-scoped, and audited', () => {
  assert.match(source, /url\.pathname==='\/settings\/queues'&&req\.method==='POST'/);
  assert.match(source, /url\.pathname==='\/settings\/templates'&&req\.method==='POST'/);
  for (const route of ['POST /settings/queues', 'POST /settings/templates']) {
    const routeIndex = source.indexOf(`ROUTE_CAPABILITIES['${route}']`);
    assert.ok(routeIndex >= 0, `${route} must use its route capability`);
    const routeSource = source.slice(Math.max(0, routeIndex - 350), routeIndex + 1800);
    assert.match(routeSource, /verifyForm\(req,form,user\)/);
  }
  assert.match(source, /insert into queues\(id,tenant_id,name,strategy,active\)/);
  assert.match(source, /insert into templates\(id,tenant_id,channel_id,name,language,status\)/);
  assert.match(source, /insert into template_versions\(id,template_id,body,variables,version\)/);
  assert.match(source, /action:'queue\.created'/);
  assert.match(source, /action:'template\.created'/);
});
