const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlaywright, chromiumExecutable } = require('./helpers/browser-fixture');

const clientSource = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'public/js/realtime-inbox.js'), 'utf8');

test('Chromium realtime inbox journey deduplicates events, applies assignment/message, marks stale, and reconnects from cursor', async () => {
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ executablePath: chromiumExecutable(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html><body><div id="state" aria-live="polite"></div><ul id="events"></ul><script>${clientSource}</script></body></html>`);
    const result = await page.evaluate(async () => {
      const states = [];
      const applied = [];
      const sources = [];
      const timers = [];
      const client = CrmRealtimeInbox.createRealtimeInboxClient({
        staleAfterMs: 10,
        setTimer(fn) { const timer = { fn }; timers.push(timer); return timer; },
        clearTimer(timer) { if (timer) timer.cleared = true; },
        setConnectionState(state) { states.push(state); document.querySelector('#state').textContent = state; },
        applyEvent(event) { applied.push(event); const item = document.createElement('li'); item.textContent = event.eventType; document.querySelector('#events').append(item); },
        reconcile: async event => applied.push({ reconcile: event }),
        eventSourceFactory() {
          const listeners = new Map();
          const source = {
            readyState: 0,
            addEventListener(type, handler) { listeners.set(type, handler); },
            close() { this.closed = true; },
            emit(type, payload, lastEventId) { listeners.get(type)?.({ data: JSON.stringify(payload), lastEventId }); },
            open() { this.onopen?.(); },
            fail() { this.onerror?.(); },
          };
          sources.push(source);
          return source;
        },
      });
      const first = client.connect();
      first.open();
      const message = { eventId: 'evt-message', eventType: 'inbox.message.created', aggregate: { type: 'conversation', id: 'conv-1', version: 1 }, payload: { body: 'Olá' } };
      first.emit('inbox.message.created', message, '41');
      first.emit('inbox.message.created', message, '41');
      first.emit('inbox.assignment.changed', { eventId: 'evt-assignment', eventType: 'inbox.assignment.changed', aggregate: { type: 'conversation', id: 'conv-1', version: 2 }, payload: { assignedUserId: 'agent-1' } }, '42');
      timers.at(-1).fn();
      first.fail();
      const second = client.connect(client.lastAppliedId());
      second.open();
      return { states, applied, cursor: client.lastAppliedId(), sourceCount: sources.length, renderedEvents: document.querySelectorAll('#events li').length, stateText: document.querySelector('#state').textContent };
    });
    assert.deepEqual(result.applied.map(event => event.eventId), ['evt-message', 'evt-assignment']);
    assert.equal(result.cursor, '42');
    assert.equal(result.sourceCount, 2);
    assert.equal(result.renderedEvents, 2);
    assert.equal(result.stateText, 'connected');
    assert.ok(result.states.includes('stale'));
    assert.ok(result.states.includes('disconnected'));
  } finally {
    await browser.close();
  }
});
