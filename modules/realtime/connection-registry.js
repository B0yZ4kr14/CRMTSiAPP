function quotaError() {
  const error = new Error('connection quota exceeded');
  error.code = 'CONNECTION_QUOTA_EXCEEDED';
  error.statusCode = 429;
  return error;
}

function createConnectionRegistry(options = {}) {
  const maxPerUser = options.maxPerUser || 2;
  const maxPerTenant = options.maxPerTenant || 100;
  const maxQueueEvents = options.maxQueueEvents || 100;
  const maxQueueBytes = options.maxQueueBytes || 256 * 1024;
  const connections = new Set();

  function matches(connection, session) {
    return connection.session.tenantId === session.tenantId && connection.session.userId === session.userId;
  }

  function connectionCount(session) {
    let count = 0;
    for (const connection of connections) if (matches(connection, session)) count += 1;
    return count;
  }

  function tenantConnectionCount(tenantId) {
    let count = 0;
    for (const connection of connections) if (connection.session.tenantId === tenantId) count += 1;
    return count;
  }

  function remove(connection) {
    if (!connections.delete(connection)) return;
    connection.response.removeListener?.('drain', connection.drain);
    connection.response.removeListener?.('close', connection.close);
  }

  function terminate(connection) {
    remove(connection);
    if (typeof connection.response.end === 'function') connection.response.end();
    else connection.response.destroy?.();
  }

  function flush(connection) {
    if (connection.closed) return false;
    while (connection.queue.length > 0) {
      const frame = connection.queue.shift();
      connection.queuedBytes -= Buffer.byteLength(frame);
      if (!connection.response.write(frame)) {
        connection.blocked = true;
        return true;
      }
    }
    connection.blocked = false;
    return true;
  }

  function enqueue(connection, frame) {
    const bytes = Buffer.byteLength(frame);
    if (connection.queue.length >= maxQueueEvents || connection.queuedBytes + bytes > maxQueueBytes) {
      connection.closed = true;
      terminate(connection);
      return false;
    }
    connection.queue.push(frame);
    connection.queuedBytes += bytes;
    return true;
  }

  function sendConnection(connection, frame) {
    if (connection.closed) return false;
    if (connection.blocked) return enqueue(connection, frame);
    if (!connection.response.write(frame)) connection.blocked = true;
    return true;
  }

  function register({ session, response }) {
    if (!session?.tenantId || !session?.userId) throw new TypeError('tenantId and userId are required');
    if (connectionCount(session) >= maxPerUser || tenantConnectionCount(session.tenantId) >= maxPerTenant) throw quotaError();
    const connection = { session: { ...session }, response, queue: [], queuedBytes: 0, blocked: false, closed: false };
    connection.drain = () => flush(connection);
    connection.close = () => { connection.closed = true; remove(connection); };
    response.on?.('drain', connection.drain);
    response.on?.('close', connection.close);
    connections.add(connection);
    return () => connection.close();
  }

  function send(session, frame) {
    let ok = true;
    for (const connection of [...connections]) if (matches(connection, session)) ok = sendConnection(connection, frame) && ok;
    return ok;
  }

  function entries(tenantId) {
    return [...connections].filter(connection => !tenantId || connection.session.tenantId === tenantId);
  }

  function sendTo(connection, frame) {
    if (!connections.has(connection)) return false;
    return sendConnection(connection, frame);
  }

  function close(connection) {
    if (!connections.has(connection)) return;
    connection.closed = true;
    terminate(connection);
  }

  return { close, connectionCount, entries, register, send, sendTo, tenantConnectionCount };
}

module.exports = { createConnectionRegistry };
