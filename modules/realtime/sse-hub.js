const { createConnectionRegistry } = require('./connection-registry');
const { eventFrame } = require('./sse-protocol');

function audienceAllows(session, audience = {}) {
  const requiredTeams = Array.isArray(audience.teamIds) ? audience.teamIds : [];
  const requiredCapabilities = Array.isArray(audience.capabilities) ? audience.capabilities : [];
  const teams = new Set(session.teamIds || []);
  const capabilities = new Set(session.capabilities || []);
  return requiredTeams.every(teamId => teams.has(teamId))
    && requiredCapabilities.every(capability => capabilities.has('*') || capabilities.has(capability));
}

function createSseHub(options = {}) {
  const registry = options.registry || createConnectionRegistry(options);
  const authorize = options.authorize || (async () => false);

  function register(client) {
    return registry.register(client);
  }

  async function publish({ tenantId, event }) {
    let delivered = 0;
    for (const connection of registry.entries(tenantId)) {
      if (!audienceAllows(connection.session, event.audience)) continue;
      const allowed = await authorize(connection.session, 'realtime:read', event);
      if (!allowed) {
        const revoked = {
          sequence: event.sequence,
          eventType: 'system.permission-revoked',
          payload: { eventId: `permission-revoked-${event.sequence}` },
        };
        registry.sendTo(connection, eventFrame(revoked));
        registry.close(connection);
        continue;
      }
      if (registry.sendTo(connection, eventFrame(event))) delivered += 1;
    }
    return delivered;
  }

  return {
    connectionCount: registry.connectionCount,
    publish,
    register,
    tenantConnectionCount: registry.tenantConnectionCount,
  };
}

const defaultHub = createSseHub({ authorize: async () => true });

module.exports = {
  audienceAllows,
  broadcast: (eventType, data) => defaultHub.publish({
    tenantId: data?.tenantId,
    event: { sequence: data?.sequence || 0, eventType, payload: data, audience: data?.audience || {} },
  }),
  createSseHub,
  register: client => defaultHub.register(client.response ? client : { response: client, session: client.session || {} }),
};
