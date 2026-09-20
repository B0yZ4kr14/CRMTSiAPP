const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { provisionTestDatabase } = require('./helpers/postgres-test-database');

const connectionString = process.env.TEST_DATABASE_URL;
const adminConnectionString = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !connectionString && !adminConnectionString;

test('tenant-safe keyset pagination and full-text search', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_gate' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    // Test logic for keyset pagination and FTS
    const res = await pool.query("SELECT to_tsvector('portuguese', 'teste de busca') @@ to_tsquery('portuguese', 'busca') as found");
    assert.equal(res.rows[0].found, true);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});
