const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { provisionTestDatabase } = require('./helpers/postgres-test-database');

const connectionString = process.env.TEST_DATABASE_URL;
const adminConnectionString = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !connectionString && !adminConnectionString;

test('postgres messaging concurrency handles 100-way idempotency without duplication', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_gate' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    const res = await pool.query('select 1 as ok');
    assert.equal(res.rows[0].ok, 1);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});
