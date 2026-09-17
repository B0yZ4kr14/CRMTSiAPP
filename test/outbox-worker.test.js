const test = require('node:test');
const assert = require('node:assert/strict');
const { processOne } = require('../outbox-worker');

test('worker claims and delivers one queued job through its provider adapter', async () => {
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('from outbox_jobs')) return { rows: [{ id: 'job-1', provider: 'fake', kind: 'text', payload: { to: '5511999999999', body: 'Olá' }, attempts: 0, max_attempts: 8 }] };
      return { rows: [] };
    },
  };
  const result = await processOne({ pool, workerId: 'test-worker', adapters: { fake: { sendText: async () => ({ providerMessageId: 'fake:job-1', status: 'sent' }) } } });
  assert.deepEqual(result, { id: 'job-1', status: 'sent' });
  assert.ok(calls.some(({ sql }) => sql.includes("set status='sent'")));
});

test('worker marks an unsupported provider job as failed without crashing the loop', async () => {
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('from outbox_jobs')) return { rows: [{ id: 'job-2', provider: 'none', kind: 'text', payload: {}, attempts: 0, max_attempts: 8 }] };
      return { rows: [] };
    },
  };
  const result = await processOne({ pool, workerId: 'test-worker', adapters: {} });
  assert.deepEqual(result, { id: 'job-2', status: 'retrying' });
  assert.ok(calls.some(({ sql }) => sql.includes("set status='failed'")));
});