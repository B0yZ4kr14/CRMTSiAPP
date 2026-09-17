const test = require('node:test');
const assert = require('node:assert/strict');
const { processOne } = require('../outbox-worker');

test('worker forwards a template job to the persisted Meta adapter contract', async () => {
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('from outbox_jobs')) return { rows: [{ id: 'job-template-1', provider: 'meta', kind: 'template', payload: { to: '5511999999999', name: 'retorno_inicial', language: 'pt_BR', variables: ['Ana'] }, attempts: 0, max_attempts: 8 }] };
      return { rows: [] };
    },
  };
  let delivery;
  const result = await processOne({ pool, workerId: 'test-worker', adapters: { meta: { sendTemplate: async (payload) => { delivery = payload; return { providerMessageId: 'wamid.template-1', status: 'sent' }; } } } });
  assert.deepEqual(result, { id: 'job-template-1', status: 'sent' });
  assert.deepEqual(delivery, { to: '5511999999999', name: 'retorno_inicial', language: 'pt_BR', variables: ['Ana'], clientMessageId: 'job-template-1', channel: { provider: 'meta', config: {} } });
  assert.ok(calls.some(({ sql }) => sql.includes("set status='sent'")));
});
