const { ensureBootstrapAdmin } = require('../../../bootstrap-admin');
const { readSecretFromStdin } = require('../secret-input');

async function createAdmin({ client, tenantId, args, readSecret = readSecretFromStdin }) {
  const email = String(args.email || '').trim();
  const login = String(args.login || '').trim();
  const name = String(args.name || '').trim();
  if (!email || !login || !name) {
    const error = new Error('ADMIN_IDENTITY_REQUIRED');
    error.code = 'ADMIN_IDENTITY_REQUIRED';
    throw error;
  }
  const password = await readSecret();
  const admin = await ensureBootstrapAdmin(client, { email, login, name, password }, { transaction: true, lockKey: `admin:${tenantId}:${email}` });
  return { created: admin.created, id: admin.id, email, login, name };
}

async function resetAdminPassword({ client, tenantId, args, readSecret = readSecretFromStdin }) {
  const email = String(args.email || '').trim();
  if (!email) {
    const error = new Error('ADMIN_IDENTITY_REQUIRED');
    error.code = 'ADMIN_IDENTITY_REQUIRED';
    throw error;
  }
  const password = await readSecret();
  if (password.length < 12) {
    const error = new Error('PASSWORD_TOO_SHORT');
    error.code = 'PASSWORD_TOO_SHORT';
    throw error;
  }
  const crypto = require('node:crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  const result = await client.query('update users set password_salt=$1,password_hash=$2,updated_at=now() where email=$3 and active=true returning id', [salt, hash, email]);
  if (!result.rowCount) {
    const error = new Error('NOT_FOUND');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return { reset: true, id: result.rows[0].id, email };
}

module.exports = { createAdmin, resetAdminPassword };