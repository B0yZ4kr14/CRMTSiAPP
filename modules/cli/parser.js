const CLI_VERSION = '1.0.0';

const SECRET_OPTIONS = new Set([
  '--password', '--secret', '--token', '--access-token', '--api-key',
  '--app-secret', '--verify-token', '--webhook-token',
]);

const GLOBAL_OPTIONS = new Set([
  '--help', '-h', '--version', '-V', '--json', '--tenant',
  '--idempotency-key', '--yes', '--email', '--login', '--name', '--kind',
  '--target', '--timeout', '--deep',
]);

const VALUE_OPTIONS = new Set(['--tenant', '--idempotency-key', '--email', '--login', '--name', '--kind', '--target', '--timeout']);

const COMMANDS = Object.freeze({
  admin: new Set(['create', 'reset-password']),
  health: new Set(['check']),
  workers: new Set(['list']),
  queues: new Set(['drain']),
  privacy: new Set(['request']),
});

const DESTRUCTIVE = new Set([
  'admin:reset-password',
  'queues:drain',
  'privacy:request',
]);

function error(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

function isSecretOption(token) {
  const option = String(token).split('=')[0];
  return SECRET_OPTIONS.has(option);
}

function parseArgs(argv) {
  const global = { help: false, version: false, json: false, tenant: null, idempotencyKey: null, yes: false, deep: false, options: {} };
  const command = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index]);

    if (isSecretOption(token)) throw error('SECRET_IN_ARGV');
    if (!token.startsWith('-')) {
      command.push(token);
      continue;
    }

    if (token === '--help' || token === '-h') { global.help = true; continue; }
    if (token === '--version' || token === '-V') { global.version = true; continue; }
    if (token === '--json') { global.json = true; continue; }
    if (token === '--yes') { global.yes = true; continue; }
    if (token === '--deep') { global.deep = true; continue; }

    const option = token.includes('=') ? token.slice(0, token.indexOf('=')) : token;
    if (VALUE_OPTIONS.has(option)) {
      const value = token.includes('=') ? token.slice(option.length + 1) : argv[++index];
      if (!value || String(value).startsWith('-')) {
        throw error(option === '--tenant' ? 'TENANT_REQUIRED' : option === '--idempotency-key' ? 'IDEMPOTENCY_KEY_REQUIRED' : 'OPTION_VALUE_REQUIRED');
      }
      if (option === '--tenant') global.tenant = String(value);
      else if (option === '--idempotency-key') global.idempotencyKey = String(value);
      else global.options[option.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
      continue;
    }

    throw error('UNKNOWN_GLOBAL_OPTION');
  }

  if (!global.help && !global.version && command.length === 0) throw error('COMMAND_REQUIRED');
  if (command.length === 1 && !global.help && !global.version) throw error('COMMAND_REQUIRED');

  return { global, command: command.length ? command : null };
}

function parseCommand(command) {
  if (!Array.isArray(command) || command.length !== 2) throw error('COMMAND_REQUIRED');
  const [family, action] = command;
  if (!COMMANDS[family] || !COMMANDS[family].has(action)) throw error('UNKNOWN_COMMAND');
  return { family, action };
}

function validateCommand(parsed) {
  if (!parsed.command) return;
  const command = parseCommand(parsed.command);
  const key = `${command.family}:${command.action}`;
  if (command.family !== 'health' && !parsed.global.tenant) throw error('TENANT_REQUIRED');
  if (DESTRUCTIVE.has(key)) {
    if (!parsed.global.idempotencyKey) throw error('IDEMPOTENCY_KEY_REQUIRED');
    if (!parsed.global.yes) throw error('CONFIRMATION_REQUIRED');
  }
}

module.exports = { CLI_VERSION, parseArgs, parseCommand, validateCommand, SECRET_OPTIONS, GLOBAL_OPTIONS, COMMANDS, DESTRUCTIVE };