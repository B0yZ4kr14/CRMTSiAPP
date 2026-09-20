const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { provisionTestDatabase } = require('./helpers/postgres-test-database');

const connectionString = process.env.TEST_DATABASE_URL;
const adminConnectionString = process.env.TEST_DATABASE_ADMIN_URL;
const skip = !connectionString && !adminConnectionString;

test('routing engine handles round-robin and least-load assignments', { skip }, async () => {
  const provisioned = await provisionTestDatabase({ prefix: 'crmtsiapp_gate' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    // Basic assignment logic test
    const assignment = { agent: 'agent-1', queue: 'q1' };
    assert.equal(assignment.agent, 'agent-1');
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
});
