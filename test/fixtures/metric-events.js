module.exports = Object.freeze({
  version: '2026-09-20.1',
  timezone: 'America/Sao_Paulo',
  generatedAt: '2026-09-20T00:00:00.000Z',
  events: Object.freeze([
    { id: 'm1', tenantId: '11111111-1111-4111-8111-111111111111', occurredAt: '2026-09-19T12:00:00.000Z', type: 'conversation.opened', channel: 'waha', queue: 'support' },
    { id: 'm2', tenantId: '11111111-1111-4111-8111-111111111111', occurredAt: '2026-09-19T12:01:00.000Z', type: 'conversation.first_response', durationMs: 1000, channel: 'waha', queue: 'support' },
    { id: 'm3', tenantId: '11111111-1111-4111-8111-111111111111', occurredAt: '2026-09-19T12:02:00.000Z', type: 'conversation.first_response', durationMs: 3000, channel: 'waha', queue: 'support' },
    { id: 'm4', tenantId: '11111111-1111-4111-8111-111111111111', occurredAt: '2026-09-19T12:03:00.000Z', type: 'conversation.resolved', durationMs: 5000, channel: 'waha', queue: 'support' },
    { id: 'm5', tenantId: '22222222-2222-4222-8222-222222222222', occurredAt: '2026-09-19T12:04:00.000Z', type: 'conversation.opened', channel: 'meta', queue: 'sales' },
  ]),
});
