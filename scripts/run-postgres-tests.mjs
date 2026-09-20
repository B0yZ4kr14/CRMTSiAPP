#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testDirectory = path.join(root, 'test');

if (!process.env.TEST_DATABASE_URL && !process.env.TEST_DATABASE_ADMIN_URL) {
  process.stderr.write('TEST_DATABASE_URL or TEST_DATABASE_ADMIN_URL is required for PostgreSQL-real tests\n');
  process.exit(2);
}

const tests = fs.readdirSync(testDirectory)
  .filter(name => /^postgres-.*\.test\.js$/.test(name))
  .sort()
  .map(name => path.join('test', name));

if (tests.length === 0) {
  process.stderr.write('No files matched postgres-*.test.js; refusing an empty PostgreSQL gate\n');
  process.exit(3);
}

const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...tests], {
  cwd: root,
  env: process.env,
  encoding: 'utf8',
  timeout: Number(process.env.POSTGRES_TEST_TIMEOUT_MS || 300_000),
  maxBuffer: 64 * 1024 * 1024,
});

const stdout = result.stdout || '';
const stderr = result.stderr || '';
process.stdout.write(stdout);
process.stderr.write(stderr);

if (result.error) {
  process.stderr.write(`PostgreSQL test runner failed: ${result.error.message}\n`);
  process.exit(4);
}
if (result.signal) {
  process.stderr.write(`PostgreSQL test runner terminated by ${result.signal}\n`);
  process.exit(5);
}
if (result.status !== 0) process.exit(result.status ?? 6);

const summary = Object.fromEntries(
  [...stdout.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/gm)]
    .map(([, key, value]) => [key, Number(value)]),
);
const forbidden = ['fail', 'cancelled', 'skipped', 'todo'];
if (!Number.isInteger(summary.tests) || summary.tests < tests.length || forbidden.some(key => summary[key] !== 0)) {
  process.stderr.write(`PostgreSQL gate rejected TAP summary: ${JSON.stringify(summary)}\n`);
  process.exit(7);
}
process.exit(0);
