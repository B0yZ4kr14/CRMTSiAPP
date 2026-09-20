function recordKey({ tenantId, integration, entityId }) {
  return `${tenantId}:${integration}:${entityId}`;
}

class SyncService {
  constructor({ adapter, failureThreshold = 3 } = {}) {
    if (!adapter || typeof adapter.upsert !== 'function') throw new Error('adapter.upsert is required');
    this.adapter = adapter;
    this.failureThreshold = failureThreshold;
    this.records = new Map();
    this.circuits = new Map();
  }

  async sync({ tenantId, integration, entityId, version, payload }) {
    if (!tenantId || !integration || !entityId || !Number.isInteger(version)) throw new Error('tenantId, integration, entityId, and integer version are required');
    const circuit = this.circuits.get(integration);
    if (circuit?.open) return { status: 'circuit_open', reason: 'integration circuit is open' };

    const key = recordKey({ tenantId, integration, entityId });
    const current = this.records.get(key);
    if (current?.version === version && current.status === 'synced') return { status: 'duplicate', externalVersion: current.externalVersion };

    try {
      const result = await this.adapter.upsert({ tenantId, integration, entityId, version, payload, externalVersion: current?.externalVersion || null });
      this.records.set(key, { version, status: 'synced', externalVersion: result.externalVersion });
      this.circuits.set(integration, { failures: 0, open: false });
      return { status: 'synced', externalVersion: result.externalVersion };
    } catch (error) {
      if (error?.code === 'VERSION_CONFLICT') {
        this.records.set(key, { version, status: 'conflict', externalVersion: current?.externalVersion || null });
        return { status: 'conflict', reason: String(error.message || 'external version conflict') };
      }
      if (!error?.retryable) throw error;
      const failures = (circuit?.failures || 0) + 1;
      this.circuits.set(integration, { failures, open: failures >= this.failureThreshold });
      this.records.set(key, { version, status: 'retryable_failure', externalVersion: current?.externalVersion || null });
      return { status: 'retryable_failure', reason: String(error.message || 'integration retryable failure') };
    }
  }

  reconciliation() {
    return [...this.circuits.entries()]
      .filter(([, state]) => state.failures > 0)
      .map(([integration, state]) => ({ integration, failures: state.failures, circuitOpen: state.open }))
      .sort((left, right) => left.integration.localeCompare(right.integration));
  }
}

module.exports = { SyncService };
