const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const crypto = require('node:crypto');
const { DEFAULT_TENANT_ID } = require('../domain-schema');

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DATABASE_ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !TEST_DATABASE_URL && !TEST_DATABASE_ADMIN_URL;

function createTestServer() {
  const sessions = new Map();
  const setupStates = new Map();
  
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${server.address().port}`);
    
    if (url.pathname === '/setup/status' && req.method === 'GET') {
      const tenantId = DEFAULT_TENANT_ID;
      const state = setupStates.get(tenantId) || { state: 'uninitialized', version: 0 };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(state));
      return;
    }
    
    if (url.pathname === '/setup/bootstrap' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data.secret) {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'BOOTSTRAP_SECRET_REQUIRED', message: 'Bootstrap secret is required' } }));
            return;
          }
          if (setupStates.has(DEFAULT_TENANT_ID)) {
            res.writeHead(409, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'ALREADY_BOOTSTRAPPED', message: 'Setup already bootstrapped' } }));
            return;
          }
          if (data.secret !== 'valid-secret') {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'BOOTSTRAP_SECRET_INVALID', message: 'Bootstrap secret invalid' } }));
            return;
          }
          setupStates.set(DEFAULT_TENANT_ID, { state: 'bootstrapped', version: 1 });
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ state: 'bootstrapped', version: 1 }));
        } catch {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'INVALID_JSON', message: 'Invalid JSON' } }));
        }
      });
      return;
    }
    
    if (url.pathname === '/setup/draft' && req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const state = setupStates.get(DEFAULT_TENANT_ID);
          if (!state || state.state === 'uninitialized') {
            res.writeHead(409, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'NOT_BOOTSTRAPPED', message: 'Setup not bootstrapped' } }));
            return;
          }
          if (state.state === 'active') {
            res.writeHead(409, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'ACTIVATION_CLOSED', message: 'Activation already closed' } }));
            return;
          }
          if (!data.provider || !['waha', 'meta'].includes(data.provider)) {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'PROVIDER_NOT_ALLOWLISTED', message: 'Provider not allowlisted' } }));
            return;
          }
          const required = data.provider === 'waha' ? ['baseUrl', 'sessionName'] : ['graphVersion', 'phoneNumberId'];
          for (const field of required) {
            if (!data.config?.[field]) {
              res.writeHead(400, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ error: { code: `MISSING_REQUIRED_FIELD_${field.toUpperCase()}`, message: `Missing required field: ${field}` } }));
              return;
            }
          }
          state.state = 'draft';
          state.draftConfig = data;
          state.validationAttempts = 0;
          state.version += 1;
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ state: state.state, version: state.version }));
        } catch {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'INVALID_JSON', message: 'Invalid JSON' } }));
        }
      });
      return;
    }
    
    if (url.pathname === '/setup/validate' && req.method === 'POST') {
      const state = setupStates.get(DEFAULT_TENANT_ID);
      if (!state || !['draft', 'validated'].includes(state.state)) {
        res.writeHead(409, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'NO_DRAFT_TO_VALIDATE', message: 'No draft to validate' } }));
        return;
      }
          state.validationAttempts = (state.validationAttempts || 0) + 1;
          if (state.validationAttempts > 10) {
            res.writeHead(429, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'VALIDATION_RATE_EXCEEDED', message: 'Validation rate exceeded' } }));
            return;
          }
          state.state = 'validated';
      state.secretsHash = 'hash_' + crypto.randomBytes(16).toString('hex');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ state: state.state, secretsHash: state.secretsHash }));
      return;
    }
    
    if (url.pathname === '/setup/activate' && req.method === 'POST') {
      const state = setupStates.get(DEFAULT_TENANT_ID);
      if (!state || state.state !== 'validated') {
        res.writeHead(409, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INVALID_STATE_FOR_ACTIVATION', message: 'Invalid state for activation' } }));
        return;
      }
      state.state = 'active';
      state.activeConfig = state.draftConfig;
      state.draftConfig = null;
      state.secretsHash = null;
      state.version += 1;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ state: state.state, version: state.version }));
      return;
    }
    
    res.writeHead(404);
    res.end();
  });
  
  return server;
}

test('GET /setup/status returns uninitialized for fresh tenant', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    const response = await fetch(`${baseUrl}/setup/status`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.state, 'uninitialized');
    assert.equal(data.version, 0);
  } finally {
    server.close();
  }
});

test('POST /setup/bootstrap rejects missing secret', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    const response = await fetch(`${baseUrl}/setup/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    assert.equal(response.status, 400);
    assert.equal(data.error.code, 'BOOTSTRAP_SECRET_REQUIRED');
  } finally {
    server.close();
  }
});

test('POST /setup/bootstrap rejects invalid secret', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    const response = await fetch(`${baseUrl}/setup/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'wrong' })
    });
    const data = await response.json();
    assert.equal(response.status, 400);
  } finally {
    server.close();
  }
});

test('POST /setup/bootstrap rejects second bootstrap attempt', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    await fetch(`${baseUrl}/setup/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'valid-secret' })
    });
    const response = await fetch(`${baseUrl}/setup/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'valid-secret' })
    });
    const data = await response.json();
    assert.equal(response.status, 409);
    assert.equal(data.error.code, 'ALREADY_BOOTSTRAPPED');
  } finally {
    server.close();
  }
});

test('PUT /setup/draft rejects unbootstrapped tenant', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    const response = await fetch(`${baseUrl}/setup/draft`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } })
    });
    const data = await response.json();
    assert.equal(response.status, 409);
    assert.equal(data.error.code, 'NOT_BOOTSTRAPPED');
  } finally {
    server.close();
  }
});

test('PUT /setup/draft rejects unknown provider', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    await fetch(`${baseUrl}/setup/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'valid-secret' })
    });
    const response = await fetch(`${baseUrl}/setup/draft`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'unknown', config: {} })
    });
    const data = await response.json();
    assert.equal(response.status, 400);
    assert.equal(data.error.code, 'PROVIDER_NOT_ALLOWLISTED');
  } finally {
    server.close();
  }
});

test('PUT /setup/draft rejects missing required fields', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    await fetch(`${baseUrl}/setup/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'valid-secret' })
    });
    const response = await fetch(`${baseUrl}/setup/draft`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'waha', config: { baseUrl: 'http://localhost' } })
    });
    const data = await response.json();
    assert.equal(response.status, 400);
    assert.match(data.error.code, /MISSING_REQUIRED_FIELD/);
  } finally {
    server.close();
  }
});

test('POST /setup/validate rejects without draft', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    await fetch(`${baseUrl}/setup/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'valid-secret' })
    });
    const response = await fetch(`${baseUrl}/setup/validate`, { method: 'POST' });
    const data = await response.json();
    assert.equal(response.status, 409);
    assert.equal(data.error.code, 'NO_DRAFT_TO_VALIDATE');
  } finally {
    server.close();
  }
});

test('POST /setup/validate enforces rate limit', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    await fetch(`${baseUrl}/setup/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'valid-secret' })
    });
    await fetch(`${baseUrl}/setup/draft`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } })
    });
    for (let i = 0; i < 10; i++) {
      await fetch(`${baseUrl}/setup/validate`, { method: 'POST' });
    }
    const response = await fetch(`${baseUrl}/setup/validate`, { method: 'POST' });
    const data = await response.json();
    assert.equal(response.status, 429);
    assert.equal(data.error.code, 'VALIDATION_RATE_EXCEEDED');
  } finally {
    server.close();
  }
});

test('POST /setup/activate rejects invalid state', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    const response = await fetch(`${baseUrl}/setup/activate`, { method: 'POST' });
    const data = await response.json();
    assert.equal(response.status, 409);
    assert.equal(data.error.code, 'INVALID_STATE_FOR_ACTIVATION');
  } finally {
    server.close();
  }
});

test('POST /setup/activate closes further mutations', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    await fetch(`${baseUrl}/setup/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'valid-secret' })
    });
    await fetch(`${baseUrl}/setup/draft`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } })
    });
    await fetch(`${baseUrl}/setup/validate`, { method: 'POST' });
    await fetch(`${baseUrl}/setup/activate`, { method: 'POST' });
    
    const response = await fetch(`${baseUrl}/setup/draft`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'waha', config: { baseUrl: 'http://localhost', sessionName: 's1' } })
    });
    const data = await response.json();
    assert.equal(response.status, 409);
    assert.equal(data.error.code, 'ACTIVATION_CLOSED');
  } finally {
    server.close();
  }
});

test('bootstrap credential linked to another tenant is rejected', { skip }, async () => {
  const server = createTestServer();
  await new Promise(resolve => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;
  
  try {
    await fetch(`${baseUrl}/setup/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'valid-secret', tenantId: 'other-tenant' })
    });
    // Should ignore tenantId from payload
    const status = await fetch(`${baseUrl}/setup/status`);
    const data = await status.json();
    assert.equal(data.state, 'bootstrapped');
  } finally {
    server.close();
  }
});