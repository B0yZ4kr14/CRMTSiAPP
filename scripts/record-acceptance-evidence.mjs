#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'test/acceptance-manifest.json'), 'utf8'));
const evidenceDir = path.join(root, 'evidence/005-operational-experience');
const releaseHash = process.env.CANDIDATE_RELEASE || manifest.candidateRelease;
const env = { ...process.env };

function parseCounts(output) {
  const counts = {};
  for (const key of ['tests', 'pass', 'fail', 'skipped', 'cancelled', 'todo']) {
    const match = output.match(new RegExp(`^# ${key} (\\d+)$`, 'm'));
    if (match) counts[key === 'tests' ? 'total' : key === 'pass' ? 'passed' : key] = Number(match[1]);
  }
  return { total: counts.total || 0, passed: counts.passed || 0, failed: counts.fail || 0, skipped: counts.skipped || 0, cancelled: counts.cancelled || 0, todo: counts.todo || 0 };
}

fs.mkdirSync(evidenceDir, { recursive: true });
let overall = 0;
for (const suite of manifest.suites) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(suite.command[0], suite.command.slice(1), { cwd: root, env, encoding: 'utf8', timeout: suite.timeoutMs || 300000, maxBuffer: 64 * 1024 * 1024 });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const counts = parseCounts(output);
  const exitCode = result.error ? 1 : result.status ?? 1;
  const completedAt = new Date().toISOString();
  const evidence = { schemaVersion: 1, feature: manifest.feature, suiteId: suite.id, releaseHash, startedAt, completedAt, exitCode, status: exitCode === 0 && counts.failed === 0 && counts.skipped === 0 && counts.cancelled === 0 && counts.todo === 0 && counts.passed === counts.total ? 'passed' : 'failed', tests: counts, requirements: suite.requirements, command: suite.command.join(' '), outputTail: output.slice(-4000) };
  fs.writeFileSync(path.join(root, suite.evidencePath), `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${suite.id}: ${evidence.status} ${JSON.stringify(counts)}\n`);
  if (evidence.status !== 'passed') overall = 1;
}
process.exitCode = overall;
