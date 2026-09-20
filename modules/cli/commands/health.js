async function healthCheck({ pool, tenantId, deep = false, timeoutMs = 5000 }) {
  const startedAt = Date.now();
  const response = { healthy: true, checks: {}, durationMs: 0 };

  try {
    await Promise.race([
      pool.query('select 1 as ok'),
      new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('TIMEOUT'), { code: 'TIMEOUT' })), timeoutMs)),
    ]);
    response.checks.database = { healthy: true };
  } catch (error) {
    response.healthy = false;
    response.checks.database = { healthy: false, error: error.code === 'TIMEOUT' ? 'timeout' : 'unavailable' };
  }

  if (deep && response.healthy) {
    try {
      const tables = await pool.query(`select to_regclass('public.outbox_jobs') as outbox, to_regclass('public.webhook_events') as webhook`);
      response.checks.schema = { healthy: Boolean(tables.rows[0]?.outbox && tables.rows[0]?.webhook) };
      if (!response.checks.schema.healthy) response.healthy = false;
    } catch {
      response.healthy = false;
      response.checks.schema = { healthy: false, error: 'unavailable' };
    }
  }

  response.durationMs = Date.now() - startedAt;
  return response;
}

module.exports = { healthCheck };