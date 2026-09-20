const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

function encrypt(plaintext, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, ciphertext]).toString('base64');
}

function decrypt(envelope, password) {
  const data = Buffer.from(envelope, 'base64');
  if (data.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
    throw new Error('ENVELOPE_TOO_SHORT');
  }
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

function hashCredential(plaintext) {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

function createCredentialService(pool, options = {}) {
  const { masterKey } = options;

  if (!masterKey) {
    throw new Error('masterKey is required for credential service');
  }

  async function storeCredential(tenantId, provider, credentialType, plaintext) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      const ciphertext = encrypt(plaintext, masterKey);
      const credentialHash = hashCredential(plaintext);

      const result = await client.query(`
        insert into provider_credentials (tenant_id, provider, credential_type, credentials_ciphertext, credential_hash, version, status, created_at, updated_at)
        values ($1, $2, $3, $4, $5, 1, 'active', now(), now())
        on conflict (tenant_id, provider, credential_type) where status = 'active' do update set
          credentials_ciphertext = excluded.credentials_ciphertext,
          credential_hash = excluded.credential_hash,
          version = provider_credentials.version + 1,
          rotated_at = now(),
          updated_at = now()
        returning version
      `, [tenantId, provider, credentialType, ciphertext, credentialHash]);

      await client.query('commit');
      return { version: result.rows[0].version };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async function getCredential(tenantId, provider, credentialType) {
    const result = await pool.query(`
      select credentials_ciphertext, version from provider_credentials
      where tenant_id = $1 and provider = $2 and credential_type = $3 and status = 'active'
    `, [tenantId, provider, credentialType]);

    if (result.rows.length === 0) return null;
    return {
      plaintext: decrypt(result.rows[0].credentials_ciphertext, masterKey),
      version: result.rows[0].version,
    };
  }

  async function getCredentialMetadata(tenantId, provider, credentialType) {
    const result = await pool.query(`
      select version, credential_hash, status, created_at, rotated_at from provider_credentials
      where tenant_id = $1 and provider = $2 and credential_type = $3
    `, [tenantId, provider, credentialType]);

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async function rotateCredential(tenantId, provider, credentialType, newPlaintext) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      const current = await getCredentialMetadata(tenantId, provider, credentialType);
      if (!current) {
        await client.query('rollback');
        throw new Error('CREDENTIAL_NOT_FOUND');
      }

      const ciphertext = encrypt(newPlaintext, masterKey);
      const credentialHash = hashCredential(newPlaintext);

      await client.query(`
        update provider_credentials
        set credentials_ciphertext = $1, credential_hash = $2, version = version + 1, rotated_at = now(), updated_at = now()
        where tenant_id = $3 and provider = $4 and credential_type = $5
      `, [ciphertext, credentialHash, tenantId, provider, credentialType]);

      await client.query('commit');
      return { version: current.version + 1 };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async function revokeCredential(tenantId, provider, credentialType) {
    await pool.query(`
      update provider_credentials set status = 'revoked', updated_at = now()
      where tenant_id = $1 and provider = $2 and credential_type = $3
    `, [tenantId, provider, credentialType]);
  }

  async function listCredentials(tenantId) {
    const result = await pool.query(`
      select provider, credential_type, version, status, created_at, rotated_at from provider_credentials
      where tenant_id = $1
    `, [tenantId]);
    return result.rows;
  }

  async function createMaskedHint(tenantId, provider, credentialType) {
    const meta = await getCredentialMetadata(tenantId, provider, credentialType);
    if (!meta) return '****';
    return `****-${meta.credential_hash.slice(0, 8)}-v${meta.version}-****`;
  }

  return {
    storeCredential,
    getCredential,
    getCredentialMetadata,
    rotateCredential,
    revokeCredential,
    listCredentials,
    createMaskedHint,
  };
}

module.exports = { createCredentialService };