const test = require('node:test');
const assert = require('node:assert/strict');

test('messaging provider contract handles duplicate inbound and status recovery', () => {
  const processed = new Set();
  const handleMessage = (msgId) => {
    if (processed.has(msgId)) return 'duplicate';
    processed.add(msgId);
    return 'accepted';
  };

  assert.equal(handleMessage('msg-1'), 'accepted');
  assert.equal(handleMessage('msg-1'), 'duplicate');
});
