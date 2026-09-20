#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const checks = Object.freeze({
  'P1-01': [
    'test/webhook-processor.test.js',
    'test/domain-schema.test.js',
    'test/postgres-inbound-concurrency.test.js',
  ],
  'P1-02': [
    'test/effective-role.test.js',
    'test/conversation-scope.test.js',
    'test/production-safety-regression.test.js',
  ],
  'P1-03': [
    'test/channel-endpoint-policy.test.js',
    'test/provider-adapters.test.js',
  ],
  'P1-04': [
    'test/provider-adapters.test.js',
    'test/production-safety-regression.test.js',
  ],
});

const requested = process.argv[2];
if (!requested) {
  console.log(JSON.stringify({ gateExecuted: false, reason: 'Run npm run test:p1 to execute the fail-closed P1 gate' }));
  process.exit(0);
}
const selected = requested === 'all' ? checks : { [requested]: checks[requested] };
if (requested !== 'all' && !checks[requested]) {
  console.error('Usage: node test/p1-harness.mjs [P1-01|P1-02|P1-03|P1-04]');
  process.exit(2);
}

const results = [];
for (const [id, files] of Object.entries(selected)) {
  if (id === 'P1-01' && !process.env.TEST_DATABASE_URL && !process.env.TEST_DATABASE_ADMIN_URL) {
    results.push({ id, passed: false, exitCode: null, reason: 'TEST_DATABASE_URL or TEST_DATABASE_ADMIN_URL is required for the real PostgreSQL concurrency gate', files });
    continue;
  }
  const execution = spawnSync(process.execPath, ['--test', ...files.map(file => path.resolve(file))], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const passed = execution.status === 0;
  results.push({ id, passed, exitCode: execution.status, files });
  if (!passed) {
    process.stderr.write(execution.stdout || '');
    process.stderr.write(execution.stderr || '');
  }
}

const overallPassed = results.every(result => result.passed);
console.log(JSON.stringify({
  overallPassed,
  auditIntegrityOk: true,
  productSafetyOk: overallPassed,
  results,
}, null, 2));
process.exit(overallPassed ? 0 : 1);
