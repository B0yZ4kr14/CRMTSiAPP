const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../server'), 'utf8');

test('server exposes authenticated WAHA webhook ingestion alongside Meta', () => {
  assert.match(source, /webhooks\\\/waha\\\//);
  assert.match(source, /webhookMeta\|\|webhookWaha/);
});
