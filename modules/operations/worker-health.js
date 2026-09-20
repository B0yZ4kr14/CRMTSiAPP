async function registerHeartbeat(pool, { workerId, workerName = workerId, status = 'active' }) {
  await pool.query(
    `insert into worker_heartbeats (worker_name, worker_id, status, updated_at)
     values ($1, $2, $3, now())
     on conflict (worker_name) do update set worker_id = excluded.worker_id, status = excluded.status, updated_at = now()`,
    [workerName, workerId, status]
  );
}

module.exports = { registerHeartbeat };
