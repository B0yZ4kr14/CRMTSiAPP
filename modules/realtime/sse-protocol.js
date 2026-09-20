function safeField(value, name) {
  const text = String(value ?? '');
  if (!text || /[\r\n]/.test(text)) throw new TypeError(`${name} is invalid`);
  return text;
}

function eventFrame(event) {
  const sequence = Number(event.sequence);
  if (!Number.isSafeInteger(sequence) || sequence < 0) throw new TypeError('sequence is invalid');
  const eventType = safeField(event.eventType, 'event type');
  const aggregate = event.aggregate || (event.aggregateType ? { type: event.aggregateType, id: event.aggregateId, version: event.aggregateVersion } : undefined);
  const data = event.payload && typeof event.payload === 'object'
    ? { ...event.payload, eventId: event.payload.eventId || event.id, ...(aggregate ? { aggregate } : {}) }
    : { eventId: event.id, aggregate, data: event.payload ?? null };
  return `id: ${sequence}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

function heartbeatFrame() {
  return ': heartbeat\n\n';
}

module.exports = { eventFrame, heartbeatFrame };
