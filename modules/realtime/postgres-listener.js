const { Client } = require('pg');

const CHANNEL = 'crmtsiapp_realtime';
const TENANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseWake(payload) {
  try {
    const value = JSON.parse(payload);
    const sequence = Number(value.sequence);
    if (!TENANT_ID.test(String(value.tenantId || '')) || !Number.isSafeInteger(sequence) || sequence < 0) return null;
    return { tenantId: value.tenantId, sequence };
  } catch {
    return null;
  }
}

function createPostgresListener({ connectionString, onWake }) {
  let client;
  let notificationPayload = '';

  async function start() {
    if (client) return;
    client = new Client({ connectionString });
    await client.connect();
    client.on('notification', notification => {
      if (notification.channel !== CHANNEL) return;
      notificationPayload = notification.payload || '';
      const wake = parseWake(notificationPayload);
      if (wake) Promise.resolve(onWake(wake)).catch(() => {});
    });
    await client.query(`listen ${CHANNEL}`);
  }

  async function stop() {
    if (!client) return;
    const active = client;
    client = null;
    try { await active.query(`unlisten ${CHANNEL}`); } finally { await active.end(); }
  }

  async function notify(queryable, { tenantId, sequence }) {
    const payload = JSON.stringify({ tenantId, sequence: Number(sequence) });
    const wake = parseWake(payload);
    if (!wake) throw new TypeError('tenantId and sequence are invalid');
    await queryable.query('select pg_notify($1,$2)', [CHANNEL, payload]);
  }

  return { lastNotificationPayload: () => notificationPayload, notify, start, stop };
}

module.exports = { CHANNEL, createPostgresListener, parseWake };
