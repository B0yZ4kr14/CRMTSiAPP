const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { renderWorkspace } = require('../workspace');

const ROOT = path.resolve(__dirname, '..');

test('Inbox renders durable realtime bootstrap, connection state and external client asset', () => {
  const html = renderWorkspace('inbox', {
    conversations: [],
    realtimeCursor: 42,
  });

  assert.match(html, /id="realtime-connection-state"/);
  assert.match(html, /data-realtime-state="connecting"/);
  assert.match(html, /id="realtime-bootstrap" type="application\/json">\{"cursor":42\}<\/script>/);
  assert.match(html, /<script src="\/assets\/realtime-inbox\.js" defer><\/script>/);
  assert.doesNotMatch(html, /<script(?![^>]+type="application\/json")[^>]*>[^<]+<\/script>/);
});

test('server exposes immutable same-origin realtime client with CSP-compatible headers', () => {
  const source = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert.match(source, /url\.pathname==='\/assets\/realtime-inbox\.js'/);
  assert.match(source, /application\/javascript; charset=utf-8/);
  assert.match(source, /public, max-age=31536000, immutable/);
  assert.match(source, /script-src 'self'/);
});
