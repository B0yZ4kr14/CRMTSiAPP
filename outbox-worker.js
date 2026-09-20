const { MetaAdapter, WahaAdapter } = require('./channel-adapter');
const { decryptCredentials } = require('./channel-secrets');
const { claimNextJob, markDelivered, markFailed } = require('./outbox');

function mergeChannelCredentials(channel, credentials = {}) {
  return { ...channel, config: { ...(channel.config || {}), ...credentials } };
}

function createAdapters(options = {}) {
  return { waha: new WahaAdapter(options), meta: new MetaAdapter(options) };
}

async function loadJobChannel(pool, job) {
  if (!job.channel_id) return { provider: job.provider, config: {} };
  const { rows } = await pool.query(`select c.id,c.tenant_id,c.provider,c.config,sv.ciphertext from channels c join channel_credentials cc on cc.channel_id=c.id join secrets s on s.id=cc.secret_id join secret_versions sv on sv.id=s.active_version_id where c.id=$1 and c.tenant_id=$2`, [job.channel_id, job.tenant_id]);
  if (!rows[0]) throw new Error('channel credentials unavailable');
  let credentials;
  try { credentials = decryptCredentials(rows[0].ciphertext); } catch { throw new Error('channel credentials are unavailable'); }
  return mergeChannelCredentials(rows[0], credentials);
}

async function processOne({ pool, workerId, adapters }) {
  const job = await claimNextJob(pool, workerId);
  if (!job) return null;
  try {
    const channel = await loadJobChannel(pool, job);
    const adapter = adapters[channel.provider];
    if (!adapter) throw new Error(`unsupported provider: ${channel.provider || 'missing'}`);
    const method = job.kind === 'template' ? 'sendTemplate' : job.kind === 'media' ? 'sendMedia' : 'sendText';
    if (typeof adapter[method] !== 'function') throw new Error(`unsupported delivery kind: ${job.kind}`);
    const result = await adapter[method]({ ...job.payload, clientMessageId: job.id, channel });
    await markDelivered(pool, job, result);
    return { id: job.id, status: 'sent' };
  } catch (error) {
    const outcome = await markFailed(pool, job, error);
    return { id: job.id, status: outcome.dead ? 'dead_letter' : 'retrying' };
  }
}

module.exports = { createAdapters, loadJobChannel, mergeChannelCredentials, processOne };