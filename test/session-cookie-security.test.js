const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('session cookie secure attribute follows the public application URL protocol', () => {
  assert.match(source, /const sessionCookieSecure = new URL\(cfg\.appUrl\)\.protocol === 'https:'/);
  assert.match(source, /\$\{sessionCookieSecure \? 'Secure; ' : ''\}SameSite=Lax/);
});
