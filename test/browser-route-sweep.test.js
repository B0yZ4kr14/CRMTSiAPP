const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const Module = require('node:module');
const { once } = require('node:events');
const { DEFAULT_TENANT_ID } = require('../domain-schema');

const USER = {
  id: 'admin-route-sweep',
  login: 'admin',
  email: 'admin@example.test',
  name: 'Admin Route Sweep',
  role: 'admin',
  session_id: 'session-route-sweep',
  active_tenant_id: DEFAULT_TENANT_ID,
  assigned_roles: [],
};

class FakePool {
  async query(sql, values = []) {
    const text = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();

    if (text.includes('from sessions s join users u')) return { rows: [USER], rowCount: 1 };
    if (text.includes('from tenant_memberships where user_id=$1')) return { rows: [{ tenant_id: DEFAULT_TENANT_ID }], rowCount: 1 };
    if (text.includes('select id,name from queues where active order by name')) return { rows: [], rowCount: 0 };
    if (text.includes('from users u where u.active')) return { rows: [{ id: USER.id, name: USER.name }], rowCount: 1 };
    if (text.includes('from conversations c') && text.includes('limit 200')) return { rows: [], rowCount: 0 };
    if (text.includes('count(*)::int count')) return { rows: [{ count: 0 }], rowCount: 1 };
    if (text.includes('from contacts where tenant_id=$1')) return { rows: [], rowCount: 0 };
    if (text.includes('from leads where tenant_id=$1')) return { rows: [], rowCount: 0 };
    if (text.includes('from channels c left join channel_credentials')) return { rows: [], rowCount: 0 };
    if (text.includes('from teams t left join team_members')) return { rows: [], rowCount: 0 };
    if (text.includes('from queues where tenant_id=$1')) return { rows: [], rowCount: 0 };
    if (text.includes('from templates where tenant_id=$1')) return { rows: [], rowCount: 0 };
    if (text.includes('from automation_rules where tenant_id=$1')) return { rows: [], rowCount: 0 };
    if (text.includes('from privacy_requests where tenant_id=$1')) return { rows: [], rowCount: 0 };
    if (text.includes('from audit_events where tenant_id=$1')) return { rows: [], rowCount: 0 };
    if (text.includes('from sessions where user_id=$1')) return { rows: [], rowCount: 0 };
    if (text.includes('from settings order by key')) return { rows: [], rowCount: 0 };
    if (text.includes('select active_tenant_id from sessions where id=$1')) return { rows: [{ active_tenant_id: DEFAULT_TENANT_ID }], rowCount: 1 };

    return { rows: [], rowCount: 0 };
  }
}

async function withServer(fn) {
  const originalLoad = Module._load;
  const serverPath = require.resolve('../server');
  delete require.cache[serverPath];
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'pg') return { Pool: FakePool };
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    process.env.APP_URL = 'http://127.0.0.1:0';
    const { route } = require('../server');
    const server = http.createServer(route);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address();
    try {
      await fn(`http://127.0.0.1:${port}`);
    } finally {
      server.close();
      await once(server, 'close');
    }
  } finally {
    delete require.cache[serverPath];
    Module._load = originalLoad;
  }
}

test('authenticated primary and settings route sweep stays bounded to real implemented routes', async () => {
  const routes = [
    ['/app', 303],
    ['/inbox', 200],
    ['/connections', 200],
    ['/contacts', 200],
    ['/leads', 200],
    ['/dashboard', 200],
    ['/segments', 200],
    ['/campaigns', 200],
    ['/automation', 200],
    ['/ia', 200],
    ['/reports', 200],
    ['/settings/start', 200],
    ['/settings/channels', 200],
    ['/settings/team', 200],
    ['/settings/security', 200],
    ['/settings/queues', 200],
    ['/settings/templates', 200],
    ['/settings/automation', 200],
    ['/settings/privacy', 200],
    ['/settings/appearance', 200],
  ];

  await withServer(async baseUrl => {
    for (const [pathname, expectedStatus] of routes) {
      const response = await fetch(`${baseUrl}${pathname}`, {
        redirect: 'manual',
        headers: { cookie: 'crmtsiapp_session=route-sweep-token' },
      });
      assert.equal(response.status, expectedStatus, pathname);
      if (response.status === 200) {
        const html = await response.text();
        assert.match(html, /CRMTSiAPP/, pathname);
        assert.doesNotMatch(html, /Erro interno/, pathname);
      }
    }
  });
});
