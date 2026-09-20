const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { ensureBootstrapAdmin } = require('../bootstrap-admin');

function fakeClient(existing = null) {
  const calls = [];
  return {
    calls,
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (/select id from users where email=\$1/i.test(sql)) {
        return { rowCount: existing ? 1 : 0, rows: existing ? [{ id: existing }] : [] };
      }
      return { rowCount: 1, rows: [] };
    },
  };
}

test('creates the bootstrap administrator with a salted scrypt hash when absent', async () => {
  const client = fakeClient();
  const result = await ensureBootstrapAdmin(client, {
    email: 'admin@tsiapp.io',
    login: 'admin',
    name: 'Administrador',
    password: 'not-a-real-production-secret',
  });

  assert.equal(result.created, true);
  const insert = client.calls.find(({ sql }) => /insert into users/i.test(sql));
  assert.ok(insert);
  const [, login, email, name, role, salt, hash] = insert.values;
  assert.equal(login, 'admin');
  assert.equal(email, 'admin@tsiapp.io');
  assert.equal(name, 'Administrador');
  assert.equal(role, 'admin');
  assert.match(salt, /^[a-f0-9]{32}$/);
  assert.match(hash, /^[a-f0-9]{128}$/);
  assert.equal(
    crypto.scryptSync('not-a-real-production-secret', salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex'),
    hash,
  );
});

test('never overwrites an existing administrator password during migration', async () => {
  const client = fakeClient('existing-admin');
  const result = await ensureBootstrapAdmin(client, {
    email: 'admin@tsiapp.io',
    login: 'admin',
    name: 'Administrador',
    password: 'not-a-real-production-secret',
  });

  assert.deepEqual(result, { created: false, id: 'existing-admin' });
  assert.equal(client.calls.some(({ sql }) => /insert into users/i.test(sql)), false);
});

test('rejects a missing or unsafe bootstrap password instead of creating an unusable account', async () => {
  await assert.rejects(
    ensureBootstrapAdmin(fakeClient(), {
      email: 'admin@tsiapp.io',
      login: 'admin',
      name: 'Administrador',
      password: '',
    }),
    /bootstrap administrator password/i,
  );
});
