const test = require('node:test');
const assert = require('node:assert/strict');

const { IntegrationRegistry } = require('../modules/integrations/registry');

test('integration registry rejects unknown integrations and exposes disabled provider state without credentials', async () => {
  const registry = new IntegrationRegistry();
  assert.throws(() => registry.get('unknown'), /unknown integration/i);

  const calendar = registry.get('calendar');
  assert.deepEqual(calendar.status({}), { enabled: false, reason: 'not_configured' });
  await assert.rejects(() => calendar.execute({}), /not configured/i);
});

test('integration adapters validate typed payloads and keep payment links opaque', async () => {
  const registry = new IntegrationRegistry({
    payment: { enabled: true, handler: async ({ amountCents }) => ({ url: 'https://pay.example/link/token', amountCents }) },
  });
  const payment = registry.get('payment');

  await assert.rejects(() => payment.execute({ amountCents: -1 }), /amountCents/i);
  const result = await payment.execute({ amountCents: 2500, currency: 'BRL' });
  assert.deepEqual(result, { amountCents: 2500, opaqueLink: true });
  assert.equal('url' in result, false);
});

test('integration adapters do not invoke network handlers while disabled', async () => {
  let invoked = 0;
  const registry = new IntegrationRegistry({ customer: { enabled: false, handler: async () => { invoked += 1; } } });
  await assert.rejects(() => registry.get('customer').execute({ id: 'cust-1' }), /not configured/i);
  assert.equal(invoked, 0);
});
