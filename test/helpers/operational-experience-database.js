const { Pool } = require('pg');
const { configuredConnection, provisionTestDatabase, withTestDatabase } = require('./postgres-test-database');

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/i;

function quoteIdentifier(value) {
  if (!IDENTIFIER.test(value)) throw new Error(`invalid cleanup table identifier: ${value}`);
  return `"${value}"`;
}

function buildTenantCleanupStatements(tenantId, tables) {
  if (!tenantId) throw new Error('tenantId is required for tenant-aware cleanup');
  if (!Array.isArray(tables) || tables.length === 0) throw new Error('cleanup tables are required');
  return tables.map(table => {
    const parts = String(table).split('.');
    if (parts.length !== 2 || parts.some(part => !IDENTIFIER.test(part))) {
      throw new Error(`invalid cleanup table: ${table}`);
    }
    return {
      text: `delete from ${parts.map(quoteIdentifier).join('.')} where tenant_id = $1`,
      values: [tenantId],
    };
  });
}

async function cleanupTenant(pool, tenantId, tables) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const statement of buildTenantCleanupStatements(tenantId, tables)) {
      await client.query(statement.text, statement.values);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function withOperationalDatabase(fn, options = {}) {
  const provisioned = await provisionTestDatabase({ prefix: options.prefix || 'crmtsiapp_oe' });
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    return await fn({
      pool,
      connectionString: provisioned.connectionString,
      isolated: provisioned.isolated,
      cleanupTenant: (tenantId, tables) => cleanupTenant(pool, tenantId, tables),
    });
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
}

module.exports = {
  buildTenantCleanupStatements,
  cleanupTenant,
  configuredConnection,
  provisionTestDatabase,
  withOperationalDatabase,
  withTestDatabase,
};
