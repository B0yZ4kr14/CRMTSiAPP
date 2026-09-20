const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workspace = fs.readFileSync(path.join(__dirname, '..', 'workspace.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('settings navigation exposes every executable settings domain', () => {
  for (const section of ['start', 'channels', 'team', 'queues', 'templates', 'automation', 'privacy', 'security', 'appearance']) {
    assert.match(workspace, new RegExp(`'${section}'`));
    assert.match(server, new RegExp(`'${section}'`));
  }
});

test('dashboard is backed by tenant-scoped live queries, not hardcoded KPI values', () => {
  assert.match(server, /from conversations where tenant_id=\$1 and status='open'/);
  assert.match(server, /from outbox_jobs where tenant_id=\$1 and status in \('failed','dead_letter','delivery_unknown'\)/);
  assert.doesNotMatch(server, /const metrics=\{frt:'42s',sla:'99\.2%',backlog:'3'\}/);
  assert.match(workspace, /Dados ao vivo|calculados do PostgreSQL/);
});

test('settings data queries are tenant-scoped and security sessions are rendered', () => {
  assert.match(server, /from teams t left join team_members tm on tm\.team_id=t\.id where t\.tenant_id=\$1/);
  assert.match(server, /from channels c left join channel_credentials cc on cc\.channel_id=c\.id where c\.tenant_id=\$1/);
  assert.match(server, /from queues where tenant_id=\$1/);
  assert.match(server, /from templates where tenant_id=\$1/);
  assert.match(workspace, /Sessões e identidade/);
});
