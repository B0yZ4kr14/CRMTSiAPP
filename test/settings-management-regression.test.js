const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const workspace = fs.readFileSync(path.join(__dirname, '..', 'workspace.js'), 'utf8');

test('queue and template settings expose tenant-scoped creation workflows', () => {
  assert.match(server, /url\.pathname==='\/settings\/queues'&&req\.method==='POST'/);
  assert.match(server, /url\.pathname==='\/settings\/templates'&&req\.method==='POST'/);
  assert.match(server, /insert into queues\(id,tenant_id,name,strategy,active\)/);
  assert.match(server, /insert into templates\(id,tenant_id,channel_id,name,language,status\)/);
  assert.match(server, /insert into template_versions\(id,template_id,body,variables,version\)/);
  assert.match(server, /action:'queue\.created'/);
  assert.match(server, /action:'template\.created'/);
  assert.match(workspace, /action="\/settings\/queues"/);
  assert.match(workspace, /action="\/settings\/templates"/);
});
