const KNOWN_INTEGRATIONS = new Set(['customer', 'order', 'ticket', 'payment', 'catalog', 'calendar']);

function disabledAdapter() {
  return Object.freeze({
    status: () => ({ enabled: false, reason: 'not_configured' }),
    execute: async () => { throw new Error('integration not configured'); },
  });
}

function configuredAdapter(name, definition) {
  return Object.freeze({
    status: () => ({ enabled: true, name }),
    execute: async payload => {
      if (name === 'payment' && (!Number.isInteger(payload?.amountCents) || payload.amountCents <= 0)) throw new Error('amountCents must be a positive integer');
      const result = await definition.handler(payload);
      if (name === 'payment') return { amountCents: result.amountCents, opaqueLink: true };
      return result;
    },
  });
}

class IntegrationRegistry {
  constructor(config = {}) {
    this.config = config;
  }

  get(name) {
    if (!KNOWN_INTEGRATIONS.has(name)) throw new Error(`unknown integration: ${name}`);
    const definition = this.config[name];
    return definition?.enabled && typeof definition.handler === 'function' ? configuredAdapter(name, definition) : disabledAdapter();
  }
}

module.exports = { IntegrationRegistry, KNOWN_INTEGRATIONS };
