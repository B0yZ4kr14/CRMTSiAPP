const { eventFrame, heartbeatFrame } = require('./sse-protocol');

function writeJson(response, status, code, message, headers = {}) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify({ error: { code, message } }));
}

function parseCursor(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (!/^\d+$/.test(String(value))) return null;
  const cursor = Number(value);
  return Number.isSafeInteger(cursor) ? cursor : null;
}

function encodeEventFrame(event) {
  return eventFrame(event);
}

function createSseRoute(options) {
  const setHeartbeat = options.setHeartbeat || setInterval;
  const clearHeartbeat = options.clearHeartbeat || clearInterval;

  return async function sseRoute(request, response) {
    const session = await options.authenticate(request);
    if (!session?.userId || !session?.tenantId) {
      writeJson(response, 401, 'AUTHENTICATION_REQUIRED', 'authentication required');
      return;
    }
    if (!await options.authorize(session, 'realtime:read')) {
      writeJson(response, 403, 'FORBIDDEN', 'forbidden');
      return;
    }

    const cursor = parseCursor(request.headers?.['last-event-id']);
    if (cursor === null) {
      writeJson(response, 409, 'CURSOR_INVALID', 'cursor invalid');
      return;
    }
    if (options.hub.connectionCount(session) >= options.maxConnectionsPerUser) {
      writeJson(response, 429, 'CONNECTION_QUOTA_EXCEEDED', 'connection quota exceeded', { 'retry-after': '5' });
      return;
    }

    let current;
    let replay;
    try {
      current = await options.eventStore.currentSequence(session.tenantId);
      if (cursor > current) {
        writeJson(response, 409, 'CURSOR_INVALID', 'cursor is ahead of the durable stream');
        return;
      }
      replay = await options.eventStore.replay({ tenantId: session.tenantId, cursor, session });
    } catch {
      writeJson(response, 503, 'EVENT_SOURCE_UNAVAILABLE', 'event source unavailable');
      return;
    }

    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    response.flushHeaders?.();

    if (replay.cursorExpired) {
      response.write(encodeEventFrame({
        sequence: current,
        eventType: 'system.reconcile-required',
        payload: { cursor: current },
      }));
      response.end();
      return;
    }
    for (const event of replay.events) response.write(encodeEventFrame(event));

    const unregister = options.hub.register({ response, session, cursor: current });
    const heartbeat = setHeartbeat(() => response.write(heartbeatFrame()), options.heartbeatMs);
    const close = () => {
      clearHeartbeat(heartbeat);
      unregister();
    };
    request.once?.('close', close);
    response.once?.('close', close);
  };
}

module.exports = { createSseRoute, encodeEventFrame, parseCursor };
