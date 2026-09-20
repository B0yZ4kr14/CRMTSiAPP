const crypto = require('node:crypto');

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
}

function normalizeBootstrapIdentity({ email, login, name }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedLogin = String(login || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim();
  if (!normalizedEmail || !normalizedLogin || !normalizedName) {
    throw new Error('bootstrap administrator identity is incomplete');
  }
  return { email: normalizedEmail, login: normalizedLogin, name: normalizedName };
}

async function ensureBootstrapAdmin(client, { email, login, name, password }, options = {}) {
  const { transaction = false, lockKey = 'bootstrap_admin' } = options;
  const identity = normalizeBootstrapIdentity({ email, login, name });
  const plainPassword = String(password || '');
  if (plainPassword.length < 12) {
    throw new Error('bootstrap administrator password must be configured and contain at least 12 characters');
  }

  const queryable = transaction ? client : client;

  if (transaction) {
    await queryable.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [lockKey]);
  }

  const existing = await queryable.query('select id from users where email=$1', [identity.email]);
  if (existing.rowCount) {
    return { created: false, id: existing.rows[0].id };
  }

  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(plainPassword, salt);
  await queryable.query(
    'insert into users(id,login,email,name,role,password_salt,password_hash,active) values($1,$2,$3,$4,$5,$6,$7,true)',
    [id, identity.login, identity.email, identity.name, 'admin', salt, hash],
  );

  return { created: true, id };
}

async function ensureBootstrapAdminIdempotent(client, { email, login, name, password }) {
  return ensureBootstrapAdmin(client, { email, login, name, password }, { transaction: true });
}

module.exports = { ensureBootstrapAdmin, ensureBootstrapAdminIdempotent, hashPassword };
