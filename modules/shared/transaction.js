const { OperationalError } = require('./operational-errors');

async function withTransaction(pool, operation) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await operation(client);
    await client.query('commit');
    return result;
  } catch (cause) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve only the original failure; rollback details may contain backend internals.
    }
    if (cause instanceof OperationalError) throw cause;
    throw new OperationalError('INTERNAL_ERROR', 'transaction failed', { cause });
  } finally {
    client.release();
  }
}

module.exports = { withTransaction };
