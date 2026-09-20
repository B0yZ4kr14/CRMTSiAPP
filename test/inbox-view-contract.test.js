const test = require('node:test');
const assert = require('node:assert/strict');
const { getInboxView } = require('../modules/inbox/workspace');

test('inbox view contract covers queue filters', () => {
  const view = getInboxView({ tenantId: 't1', filter: 'unassigned' });
  assert.equal(view.filter, 'unassigned');
});

test('inbox view contract generates shareable URLs', () => {
  const url = getInboxView({ tenantId: 't1', filter: 'mine' }).url;
  assert.match(url, /\/inbox\?filter=mine/);
});
