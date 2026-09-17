const { Pool } = require('pg');
const crypto = require('crypto');
const { processOneWebhook } = require('./webhook-worker');

const pollMs = Math.max(100, Number(process.env.WEBHOOK_POLL_MS || 1000));
const workerId = process.env.WEBHOOK_WORKER_ID || `${process.env.HOSTNAME || 'crmtsiapp'}:${process.pid}:${crypto.randomUUID()}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let stopping = false;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function run() {
  while (!stopping) {
    try {
      const result = await processOneWebhook({ pool, workerId });
      if (!result) await sleep(pollMs);
    } catch (error) {
      console.error(JSON.stringify({ level:'error', service:'crmtsiapp-webhook-worker', event:'cycle_failed', message:String(error.message || error) }));
      await sleep(pollMs);
    }
  }
}

async function stop() { stopping = true; await pool.end(); }
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
run().catch(async error => { console.error(JSON.stringify({ level:'error', service:'crmtsiapp-webhook-worker', event:'fatal', message:String(error.message || error) })); await stop(); process.exitCode = 1; });
