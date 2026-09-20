const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const cli = path.join(__dirname, '..', 'bin', 'crm-cli.js');

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    input: options.input,
  });
}

test('crm-cli exposes help and version without DATABASE_URL', () => {
  const help = run(['--help'], { env: { DATABASE_URL: '' } });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: crm-cli/);
  assert.equal(help.stderr, '');

  const version = run(['--version'], { env: { DATABASE_URL: '' } });
  assert.equal(version.status, 0);
  assert.match(version.stdout, /^crm-cli 1\.0\.0\n$/);
});

test('crm-cli rejects secret argv before any database work', () => {
  const result = run(['admin', 'create', '--password', 'never-in-argv'], { env: { DATABASE_URL: '' } });
  assert.equal(result.status, 2);
  assert.doesNotMatch(result.stdout + result.stderr, /never-in-argv/);
  assert.match(result.stderr, /SECRET_IN_ARGV/);
});

test('crm-cli emits JSON error envelope and stable validation exit code', () => {
  const result = run(['--json', 'admin', 'create'], { env: { DATABASE_URL: '' } });
  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.error.code, 'TENANT_REQUIRED');
  assert.equal(output.error.message, 'Operation failed');
});
