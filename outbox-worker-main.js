const { Pool } = require('pg');
const crypto = require('crypto');
const { createAdapters, processOne } = require('./outbox-worker');

const pollMs = Math.max(100, Number(process.env.OUTBOX_POLL_MS || 1000));
const workerId = process.env.OUTBOX_WORKER_ID || `${process.env.HOSTNAME || 'crmtsiapp'}:${process.pid}:${crypto.randomUUID()}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapters = createAdapters();
let stopping = false;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function run() {
  while (!stopping) {
    try {
      const result = await processOne({ pool, workerId, adapters });
      if (!result) await sleep(pollMs);
    } catch (error) {
      console.error('outbox worker cycle failed:', error.message);
      await sleep(pollMs);
    }
  }
}

async function stop() { stopping = true; await pool.end(); }
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
run().catch(async error => { console.error(error); await stop(); process.exitCode = 1; });