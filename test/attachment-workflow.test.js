const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAttachment } = require('../modules/inbox/attachment-service');

test('attachment validation enforces size limits and allowed types', () => {
  const valid = validateAttachment({ size: 1024, mimetype: 'image/png', name: 'image.png' });
  assert.equal(valid, true);

  const tooLarge = validateAttachment({ size: 20 * 1024 * 1024, mimetype: 'image/png', name: 'big.png' });
  assert.equal(tooLarge, false);

  const disallowedType = validateAttachment({ size: 1024, mimetype: 'application/x-msdownload', name: 'malware.exe' });
  assert.equal(disallowedType, false);
});
