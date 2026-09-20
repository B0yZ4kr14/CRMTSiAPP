#!/usr/bin/env node
const { Pool } = require('pg');
const { CLI_VERSION, parseArgs, parseCommand, validateCommand } = require('../modules/cli/parser');
const { EXIT_CODES, renderResult, renderError, exitCodeForError } = require('../modules/cli/output');
const { createOperationRunner } = require('../modules/cli/operation-runner');
const { createAdmin, resetAdminPassword } = require('../modules/cli/commands/admin');
const { healthCheck } = require('../modules/cli/commands/health');
const { listWorkers } = require('../modules/cli/commands/workers');
const { drainQueues } = require('../modules/cli/commands/queues');
const { createPrivacyRequest } = require('../modules/cli/commands/privacy');

function usage() {
  return `Usage: crm-cli [global options] <family> <command>

Global options:
  --help, -h                    Show this help
  --version, -V                 Show version
  --json                        Emit JSON output
  --tenant <id>                 Tenant context (required except health check)
  --idempotency-key <key>       Required for destructive operations
  --yes                         Non-interactive confirmation for destructive operations
  --email <email>               Administrator email
  --login <login>               Administrator login
  --name <name>                 Administrator display name
  --kind <export|anonymize|delete> Privacy request type
  --target <value>              Privacy request target
  --timeout <milliseconds>      Drain/health timeout
  --deep                        Run deep health checks

Commands:
  admin create | admin reset-password
  health check
  workers list
  queues drain
  privacy request

Secrets are accepted only from stdin or a restricted file descriptor; never via argv.
`;
}

function argsForCommand(parsed) {
  return {
    ...parsed.global.options,
    timeoutMs: parsed.global.options.timeout ? Number(parsed.global.options.timeout) : undefined,
    deep: parsed.global.deep,
  };
}

async function requirePool() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL_REQUIRED');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('select 1');
  return pool;
}

async function withTransaction(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await callback(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function execute(parsed, pool) {
  const command = parseCommand(parsed.command);
  const args = argsForCommand(parsed);
  const tenantId = parsed.global.tenant;
  const operation = `${command.family}:${command.action}`;
  const actorId = process.env.CRM_CLI_ACTOR_ID || 'crm-cli';

  if (command.family === 'health') {
    return healthCheck({ pool, deep: args.deep, timeoutMs: args.timeoutMs || 5000 });
  }

  if (command.family === 'workers') {
    return listWorkers({ pool, tenantId });
  }

  const runner = createOperationRunner({ withTransaction: callback => withTransaction(pool, callback) });
  const context = {
    tenantId,
    actorId,
    key: parsed.global.idempotencyKey || `safe-${operation}-${Date.now()}`,
    operation,
    request: args,
  };

  const response = await runner.run(context, async ({ client }) => {
    if (command.family === 'admin' && command.action === 'create') return createAdmin({ client, tenantId, args });
    if (command.family === 'admin' && command.action === 'reset-password') return resetAdminPassword({ client, tenantId, args });
    if (command.family === 'queues' && command.action === 'drain') return drainQueues({ pool, tenantId, args });
    if (command.family === 'privacy' && command.action === 'request') return createPrivacyRequest({ pool, tenantId, actorId, args });
    const error = new Error('UNKNOWN_COMMAND');
    error.code = 'UNKNOWN_COMMAND';
    throw error;
  });
  return response.result;
}

async function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs(argv);
    if (parsed.global.help) {
      process.stdout.write(usage());
      return EXIT_CODES.SUCCESS;
    }
    if (parsed.global.version) {
      process.stdout.write(`crm-cli ${CLI_VERSION}\n`);
      return EXIT_CODES.SUCCESS;
    }
    validateCommand(parsed);
    const pool = await requirePool();
    try {
      const result = await execute(parsed, pool);
      process.stdout.write(`${renderResult(result, { json: parsed.global.json })}\n`);
      return EXIT_CODES.SUCCESS;
    } finally {
      await pool.end();
    }
  } catch (error) {
    const json = Boolean(parsed?.global?.json || argv.includes('--json'));
    const output = renderError(error, { json });
    if (json) process.stdout.write(`${output}\n`);
    else process.stderr.write(`${output}\n`);
    return exitCodeForError(error);
  }
}

if (require.main === module) {
  let cancelled = false;
  process.once('SIGINT', () => {
    cancelled = true;
    process.exitCode = EXIT_CODES.CANCELLED;
  });
  main().then(code => {
    if (!cancelled) process.exitCode = code;
  }).catch(error => {
    process.stderr.write(`${renderError(error, { json: process.argv.includes('--json') })}\n`);
    process.exitCode = EXIT_CODES.INTERNAL;
  });
}

module.exports = { main, usage, execute };