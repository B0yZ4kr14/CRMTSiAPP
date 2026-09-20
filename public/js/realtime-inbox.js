(function exposeRealtimeInbox(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CrmRealtimeInbox = api;
})(typeof globalThis === 'object' ? globalThis : this, function realtimeInboxFactory() {
  const EVENT_TYPES = [
    'inbox.message.created',
    'inbox.conversation.updated',
    'inbox.assignment.changed',
    'inbox.sla.alert',
    'presence.changed',
    'system.reconcile-required',
    'system.permission-revoked',
  ];

  function createRealtimeInboxClient(options) {
    const seenEventIds = new Set();
    const aggregateVersions = new Map();
    const setTimer = options.setTimer || setTimeout;
    const clearTimer = options.clearTimer || clearTimeout;
    let source;
    let staleTimer;
    let cursor = '';

    function setState(state) {
      options.setConnectionState?.(state);
    }

    function armStaleTimer() {
      if (staleTimer) clearTimer(staleTimer);
      staleTimer = setTimer(() => setState('stale'), options.staleAfterMs || 15_000);
    }

    async function receive(message) {
      let event;
      try { event = JSON.parse(message.data); } catch { return; }
      if (!event?.eventId || !event.aggregate) return;
      if (seenEventIds.has(event.eventId)) return;

      const aggregateKey = `${event.aggregate.type}:${event.aggregate.id}`;
      const version = Number(event.aggregate.version);
      const knownVersion = aggregateVersions.get(aggregateKey) || 0;
      if (!Number.isSafeInteger(version) || version <= knownVersion) return;

      seenEventIds.add(event.eventId);
      aggregateVersions.set(aggregateKey, version);
      cursor = message.lastEventId || cursor;
      armStaleTimer();
      setState('connected');

      if (message.type === 'system.reconcile-required') await options.reconcile(event);
      else if (message.type === 'system.permission-revoked') source?.close();
      else options.applyEvent(event);
    }

    async function replayBeyondLimit(fetchPage) {
      let replayCursor = cursor;
      const pageSize = options.replayPageSize || 1000;
      while (true) {
        const page = await fetchPage(replayCursor, pageSize);
        if (!page?.events?.length) return replayCursor;
        for (const event of page.events) {
          await receive({ data: JSON.stringify(event), lastEventId: String(event.sequence), type: event.eventType });
        }
        replayCursor = page.events.at(-1).sequence;
        if (!page.hasMore) return replayCursor;
      }
    }
    function connect(initialCursor = '') {
      cursor = initialCursor === undefined || initialCursor === null ? '' : String(initialCursor);
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      source = options.eventSourceFactory(`/events${query}`);
      for (const type of EVENT_TYPES) {
        source.addEventListener(type, message => receive({ ...message, type }));
      }
      source.onopen = () => { setState('connected'); armStaleTimer(); };
      source.onerror = () => setState('disconnected');
      armStaleTimer();
      return source;
    }

    function disconnect() {
      if (staleTimer) clearTimer(staleTimer);
      source?.close();
      setState('disconnected');
    }

    return { connect, disconnect, replayBeyondLimit, lastAppliedId: () => cursor };
  }

  return { createRealtimeInboxClient };
});
