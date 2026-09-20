async function processJob(pool, { workerId, handlers }) {
  const { claimNextJob } = require('./job-store');
  const job = await claimNextJob(pool, workerId);
  if (!job) return null;

  const handler = handlers[job.kind];
  if (!handler) {
    // mark failed (unhandled)
    return null;
  }

  try {
    await handler(job.payload);
    await pool.query('update outbox_jobs set status = \'sent\', updated_at = now() where id = $1', [job.id]);
  } catch (err) {
    // handle error
  }
  return job;
}

module.exports = { processJob };
