const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { encryptCredentials } = require('../channel-secrets');
const { processOne } = require('../outbox-worker');

test('worker chooses adapter from persisted channel rather than a nonexistent job provider field', async () => {
  const calls = [];
  const key = crypto.randomBytes(32);
  const previous = process.env.CHANNEL_SECRET_KEY;
  process.env.CHANNEL_SECRET_KEY = key.toString('base64');
  try {
    const ciphertext = encryptCredentials({}, key);
    const pool = { async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('from outbox_jobs')) return { rows: [{ id:'job-1', channel_id:'channel-1', kind:'text', payload:{ to:'5511999999999', body:'Olá' }, attempts:0, max_attempts:8 }] };
      if (sql.includes('from channels c')) return { rows: [{ id:'channel-1', provider:'waha', config:{}, ciphertext }] };
      return { rows: [] };
    } };
    const result = await processOne({ pool, workerId:'test', adapters:{ waha:{ sendText: async () => ({ providerMessageId:'provider-1', status:'sent' }) } } });
    assert.deepEqual(result, { id:'job-1', status:'sent' });
    assert.ok(calls.some(call => call.sql.includes("set status='sent'")));
  } finally {
    if (previous === undefined) delete process.env.CHANNEL_SECRET_KEY; else process.env.CHANNEL_SECRET_KEY = previous;
  }
});
