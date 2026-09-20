const crypto = require('node:crypto');
const { Pool } = require('pg');

function configuredConnection() {
  const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!adminUrl && !databaseUrl) {
    const error = new Error('TEST_DATABASE_URL or TEST_DATABASE_ADMIN_URL is required for PostgreSQL-real tests');
    error.code = 'TEST_DATABASE_REQUIRED';
    throw error;
  }
  return { adminUrl, databaseUrl };
}

function databaseUrlFromAdmin(adminUrl, database) {
  const url = new URL(adminUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

async function provisionTestDatabase(options = {}) {
  const { adminUrl, databaseUrl } = configuredConnection();
  if (!adminUrl) {
    return {
      connectionString: databaseUrl,
      database: null,
      isolated: false,
      cleanup: async () => {},
    };
  }

  const prefix = String(options.prefix || 'crmtsiapp_test').replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  const database = `${prefix}_${process.pid}_${Date.now()}_${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`;
  const admin = new Pool({ connectionString: adminUrl });
  try {
    await admin.query(`create database "${database}"`);
  } catch (error) {
    await admin.end();
    throw error;
  }

  let cleaned = false;
  return {
    connectionString: databaseUrlFromAdmin(adminUrl, database),
    database,
    isolated: true,
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      try {
        await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid <> pg_backend_pid()`, [database]);
        await admin.query(`drop database if exists "${database}"`);
      } finally {
        await admin.end();
      }
    },
  };
}

async function withTestDatabase(fn, options = {}) {
  const provisioned = await provisionTestDatabase(options);
  const pool = new Pool({ connectionString: provisioned.connectionString });
  try {
    return await fn(pool, provisioned);
  } finally {
    await pool.end();
    await provisioned.cleanup();
  }
}

module.exports = {
  configuredConnection,
  databaseUrlFromAdmin,
  provisionTestDatabase,
  withTestDatabase,
};
