const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, parseCommand, validateCommand, CLI_VERSION } = require('../modules/cli/parser');

test('CLI parser recognizes global help and version flags', () => {
  const help = parseArgs(['--help']);
  assert.equal(help.global.help, true);
  assert.equal(help.command, null);

  const version = parseArgs(['--version']);
  assert.equal(version.global.version, true);
  assert.equal(version.command, null);
});

test('CLI parser recognizes json output and tenant context', () => {
  const parsed = parseArgs(['--json', '--tenant', 'tenant-a', 'health', 'check']);
  assert.equal(parsed.global.json, true);
  assert.equal(parsed.global.tenant, 'tenant-a');
  assert.deepEqual(parsed.command, ['health', 'check']);
});

test('CLI parser rejects unknown global flags', () => {
  assert.throws(() => parseArgs(['--unknown', 'health', 'check']), /UNKNOWN_GLOBAL_OPTION/);
});

test('CLI parser rejects secrets supplied in argv', () => {
  for (const argv of [
    ['admin', 'create', '--password', 'hunter2'],
    ['admin', 'reset-password', '--secret=bad'],
    ['providers', 'rotate', '--access-token', 'token'],
    ['--token', 'abc', 'health', 'check'],
  ]) {
    assert.throws(() => parseArgs(argv), /SECRET_IN_ARGV/);
  }
});

test('CLI parser parses admin subcommands', () => {
  assert.deepEqual(parseCommand(['admin', 'create']), { family: 'admin', action: 'create' });
  assert.deepEqual(parseCommand(['admin', 'reset-password']), { family: 'admin', action: 'reset-password' });
  assert.throws(() => parseCommand(['admin', 'delete']), /UNKNOWN_COMMAND/);
});

test('CLI parser parses health and workers subcommands', () => {
  assert.deepEqual(parseCommand(['health', 'check']), { family: 'health', action: 'check' });
  assert.deepEqual(parseCommand(['workers', 'list']), { family: 'workers', action: 'list' });
  assert.throws(() => parseCommand(['workers', 'restart']), /UNKNOWN_COMMAND/);
});

test('CLI parser parses queues and privacy subcommands', () => {
  assert.deepEqual(parseCommand(['queues', 'drain']), { family: 'queues', action: 'drain' });
  assert.deepEqual(parseCommand(['privacy', 'request']), { family: 'privacy', action: 'request' });
  assert.throws(() => parseCommand(['privacy', 'destroy']), /UNKNOWN_COMMAND/);
});

test('CLI parser requires tenant for tenant-scoped operations', () => {
  const parsed = parseArgs(['admin', 'create']);
  assert.throws(() => validateCommand(parsed), /TENANT_REQUIRED/);

  const health = parseArgs(['health', 'check']);
  assert.doesNotThrow(() => validateCommand(health));
});

test('CLI parser requires idempotency key for destructive commands', () => {
  const parsed = parseArgs(['--tenant', 'tenant-a', 'queues', 'drain']);
  assert.throws(() => validateCommand(parsed), /IDEMPOTENCY_KEY_REQUIRED/);

  const safe = parseArgs(['--tenant', 'tenant-a', '--yes', '--idempotency-key', 'key-1', 'queues', 'drain']);
  assert.doesNotThrow(() => validateCommand(safe));
});

test('CLI parser supports --yes for destructive confirmation', () => {
  const parsed = parseArgs(['--tenant', 'tenant-a', '--yes', '--idempotency-key', 'key-1', 'privacy', 'request']);
  assert.equal(parsed.global.yes, true);
  assert.doesNotThrow(() => validateCommand(parsed));
});

test('CLI parser rejects incomplete command grammar', () => {
  assert.throws(() => parseArgs(['admin']), /COMMAND_REQUIRED/);
  assert.throws(() => parseArgs([]), /COMMAND_REQUIRED/);
});