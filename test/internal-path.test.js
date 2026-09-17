const test = require('node:test');
const assert = require('node:assert/strict');
const { isInternalPath } = require('../security');

test('identifies deployment artifacts as non-public paths', () => {
  for (const path of ['/.env', '/.git/config', '/server.js', '/migrate.js', '/security.js', '/package.json', '/node_modules/pg/package.json']) {
    assert.equal(isInternalPath(path), true, path);
  }
});

test('does not classify CRM application routes as internal paths', () => {
  for (const path of ['/login', '/app', '/contacts', '/health', '/not-found']) {
    assert.equal(isInternalPath(path), false, path);
  }
});
