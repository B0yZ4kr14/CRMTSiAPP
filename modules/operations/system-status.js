function evaluateSystemStatus(input = {}) {
  const workers = input.workers || [];
  const degraded = [];
  if (!input.database) degraded.push('database');
  if (Number(input.outboxAgeSeconds || 0) > 300) degraded.push('outbox');
  if (Number(input.webhookAgeSeconds || 0) > 300) degraded.push('webhooks');
  for (const worker of workers) {
    if (Number(worker.ageSeconds || 0) > 300 || worker.status !== 'active') degraded.push(`worker:${worker.worker}`);
  }
  for (const provider of input.providerStates || []) {
    if (provider.state !== 'active') degraded.push(`provider:${provider.provider}`);
  }
  return Object.freeze({
    live: Object.freeze({ ok: true }),
    ready: Object.freeze({ ok: degraded.length === 0, degraded: Object.freeze(degraded) }),
    backlog: Object.freeze({
      outboxAgeSeconds: Number(input.outboxAgeSeconds || 0),
      webhookAgeSeconds: Number(input.webhookAgeSeconds || 0),
      retryCount: Number(input.retryCount || 0),
      deadLetterCount: Number(input.deadLetterCount || 0),
    }),
    release: input.release || null,
  });
}

module.exports = { evaluateSystemStatus };
