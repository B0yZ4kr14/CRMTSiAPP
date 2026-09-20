const Module = require('node:module');
const http = require('node:http');
const { once } = require('node:events');
const { DEFAULT_TENANT_ID } = require('../../domain-schema');

const DEFAULT_USER = Object.freeze({
  id: 'acceptance-admin',
  login: 'admin',
  email: 'admin@example.test',
  name: 'Acceptance Admin',
  role: 'admin',
  session_id: 'acceptance-session',
  active_tenant_id: DEFAULT_TENANT_ID,
  assigned_roles: [],
});

class AuthenticatedFakePool {
  static user = DEFAULT_USER;
  static handler = null;

  async query(sql, values = []) {
    if (AuthenticatedFakePool.handler) {
      const response = await AuthenticatedFakePool.handler(sql, values);
      if (response) return response;
    }
    const text = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
    const user = AuthenticatedFakePool.user;
    if (text.includes('from sessions s join users u')) return { rows: [user], rowCount: 1 };
    if (text.includes('from tenant_memberships where user_id=$1')) return { rows: [{ tenant_id: user.active_tenant_id }], rowCount: 1 };
    if (text.startsWith('update sessions set last_seen_at')) return { rows: [], rowCount: 1 };
    if (text.includes('count(*)::int count')) return { rows: [{ count: 0 }], rowCount: 1 };
    if (/^select\b/.test(text) || text.includes(' returning ')) return { rows: [], rowCount: 0 };
    return { rows: [], rowCount: 1 };
  }

  async connect() {
    return { query: this.query.bind(this), release() {} };
  }

  async end() {}
}

async function withAuthenticatedApp(fn, options = {}) {
  const originalLoad = Module._load;
  const originalAppUrl = process.env.APP_URL;
  const serverPath = require.resolve('../../server');
  delete require.cache[serverPath];
  AuthenticatedFakePool.user = { ...DEFAULT_USER, ...(options.user || {}) };
  AuthenticatedFakePool.handler = options.queryHandler || null;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'pg') return { Pool: AuthenticatedFakePool };
    return originalLoad.call(this, request, parent, isMain);
  };

  let server;
  try {
    process.env.APP_URL = 'http://127.0.0.1:0';
    const { route } = require('../../server');
    server = http.createServer(route);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    return await fn({
      baseUrl,
      cookie: 'crmtsiapp_session=acceptance-token',
      request(pathname, init = {}) {
        return fetch(`${baseUrl}${pathname}`, {
          redirect: 'manual',
          ...init,
          headers: { cookie: 'crmtsiapp_session=acceptance-token', ...(init.headers || {}) },
        });
      },
    });
  } finally {
    if (server) {
      server.close();
      await once(server, 'close');
    }
    delete require.cache[serverPath];
    Module._load = originalLoad;
    AuthenticatedFakePool.handler = null;
    if (originalAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalAppUrl;
  }
}

module.exports = { DEFAULT_USER, AuthenticatedFakePool, withAuthenticatedApp };
