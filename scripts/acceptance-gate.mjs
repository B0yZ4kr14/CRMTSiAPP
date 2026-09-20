#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEXT_EXTENSIONS = new Set(['.cjs', '.js', '.json', '.mjs', '.md', '.sql', '.toml', '.ts', '.yaml', '.yml']);
const IGNORED_DIRECTORIES = new Set(['.git', 'coverage', 'evidence', 'node_modules']);
const PLACEHOLDER_VALUES = new Set(['change-me', 'example', 'placeholder', 'redacted', 'replace-me', 'test']);

function walkTextFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkTextFiles(target));
    else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(target);
  }
  return files;
}

export function scanSecrets(directory = root, options = {}) {
  const findings = [];
  const excludeTests = options.excludeTests ?? path.resolve(directory) === root;
  const assignment = /\b(?:api[_-]?key|api[_-]?token|auth[_-]?token|client[_-]?secret|password|private[_-]?key|secret[_-]?key)\b\s*[:=]\s*['"]([^'"\n]{8,})['"]/gi;
  const knownToken = /\b(?:sk_(?:live|test)_[A-Za-z0-9]{12,}|gh[oprsu]_[A-Za-z0-9]{20,})\b/g;
  for (const file of walkTextFiles(directory)) {
    const relative = path.relative(directory, file);
    if (excludeTests && relative.startsWith(`test${path.sep}`)) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      assignment.lastIndex = 0;
      knownToken.lastIndex = 0;
      const assigned = assignment.exec(line);
      const value = assigned?.[1]?.trim().toLowerCase();
      if ((assigned && !PLACEHOLDER_VALUES.has(value)) || knownToken.test(line)) findings.push(`${relative}:${index + 1}: credential-like value`);
    });
  }
  return findings;
}

export function findSupabaseRuntimeReferences(directory = root, options = {}) {
  const findings = [];
  const excludeTests = options.excludeTests ?? path.resolve(directory) === root;
  const runtimeReference = /(?:from\s+['"]@supabase\/|require\(\s*['"]@supabase\/|import\(\s*['"]@supabase\/)/;
  for (const file of walkTextFiles(directory)) {
    const relative = path.relative(directory, file);
    if (excludeTests && relative.startsWith(`test${path.sep}`)) continue;
    if (relative === 'package.json') {
      const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const section of ['dependencies', 'optionalDependencies']) {
        for (const name of Object.keys(manifest[section] || {})) if (/supabase/i.test(name)) findings.push(`${relative}: runtime dependency ${name}`);
      }
      continue;
    }
    if (!/\.(?:c?js|mjs|ts)$/.test(file)) continue;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      if (runtimeReference.test(line)) findings.push(`${relative}:${index + 1}: Supabase runtime import`);
    });
  }
  return findings;
}

export function runCommandCheck(id, command, options = {}) {
  const [executable, ...args] = command;
  const environment = { ...(options.env || process.env) };
  delete environment.npm_config_allow_scripts;
  delete environment.npm_config_ignore_scripts;
  const result = spawnSync(executable, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    env: environment,
    timeout: options.timeoutMs || 120000,
  });
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  return {
    id,
    ok: !result.error && exitCode === 0,
    exitCode,
    signal: result.signal || null,
    error: result.error ? result.error.message : null,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim().slice(-4000),
  };
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function testCounts(value = {}) {
  return ['total', 'passed', 'failed', 'skipped', 'cancelled', 'todo'].reduce((counts, key) => {
    counts[key] = Number.isInteger(value[key]) && value[key] >= 0 ? value[key] : 0;
    return counts;
  }, {});
}

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) errors.push('manifest must be an object');
  if (manifest?.schemaVersion !== 1) errors.push('manifest schemaVersion must be 1');
  if (!nonEmptyString(manifest?.candidateRelease)) errors.push('candidateRelease is required');
  if (!Number.isInteger(manifest?.maxEvidenceAgeSeconds) || manifest.maxEvidenceAgeSeconds <= 0) errors.push('maxEvidenceAgeSeconds must be positive');
  if (!Array.isArray(manifest?.requiredCoverage) || manifest.requiredCoverage.length === 0) errors.push('requiredCoverage must not be empty');
  if (!Array.isArray(manifest?.suites) || manifest.suites.length === 0) errors.push('suites must not be empty');

  const suiteIds = new Set();
  const coverage = new Set();
  for (const [index, suite] of (manifest?.suites || []).entries()) {
    const prefix = `suite[${index}]`;
    if (!nonEmptyString(suite?.id)) errors.push(`${prefix} id is required`);
    else if (suiteIds.has(suite.id)) errors.push(`duplicate suite id ${suite.id}`);
    else suiteIds.add(suite.id);
    if (!Array.isArray(suite?.command) || suite.command.length === 0 || !suite.command.every(nonEmptyString)) errors.push(`${prefix} command is required`);
    if (!Number.isInteger(suite?.timeoutMs) || suite.timeoutMs <= 0) errors.push(`${prefix} timeoutMs must be positive`);
    if (!nonEmptyString(suite?.evidencePath)) errors.push(`${prefix} evidencePath is required`);
    if (!Array.isArray(suite?.requirements) || suite.requirements.length === 0) errors.push(`${prefix} requirements must not be empty`);
    for (const requirement of suite?.requirements || []) if (nonEmptyString(requirement)) coverage.add(requirement);
  }
  for (const requirement of manifest?.requiredCoverage || []) {
    if (!coverage.has(requirement)) errors.push(`${requirement} is not mapped to any suite`);
  }
  return { ok: errors.length === 0, errors };
}

export function evaluateSuiteEvidence(suite, evidence, options) {
  const errors = [];
  if (!evidence || typeof evidence !== 'object') return { ok: false, errors: ['evidence is missing'] };
  if (evidence.schemaVersion !== 1) errors.push('evidence schemaVersion must be 1');
  if (evidence.suiteId !== suite.id) errors.push(`evidence suite id does not match ${suite.id}`);
  if (evidence.releaseHash !== options.releaseHash) errors.push('evidence release hash does not match candidate release');
  if (evidence.exitCode !== 0 || evidence.status !== 'passed') errors.push('suite did not pass');

  const counts = testCounts(evidence.tests);
  if (counts.total <= 0) errors.push('test suite is empty');
  if (counts.failed > 0) errors.push(`${counts.failed} test(s) failed`);
  if (counts.skipped > 0) errors.push(`${counts.skipped} mandatory test(s) skipped`);
  if (counts.cancelled > 0) errors.push(`${counts.cancelled} mandatory test(s) cancelled`);
  if (counts.todo > 0) errors.push(`${counts.todo} mandatory test(s) todo`);
  if (counts.passed !== counts.total) errors.push('passed test count does not equal total');

  const completedAt = Date.parse(evidence.completedAt);
  if (!Number.isFinite(completedAt)) errors.push('completedAt is invalid');
  else {
    const ageSeconds = (options.now.getTime() - completedAt) / 1000;
    if (ageSeconds < 0 || ageSeconds > options.maxEvidenceAgeSeconds) errors.push('evidence is stale');
  }
  return { ok: errors.length === 0, errors, counts };
}

export function evaluateGate(manifest, evidenceBySuite, options = {}) {
  const validation = validateManifest(manifest);
  const now = options.now || new Date();
  const releaseHash = options.releaseHash || manifest.candidateRelease;
  const results = [];
  if (validation.ok) {
    for (const suite of manifest.suites) {
      const evidence = evidenceBySuite[suite.id];
      results.push({ id: suite.id, ...evaluateSuiteEvidence(suite, evidence, { now, releaseHash, maxEvidenceAgeSeconds: manifest.maxEvidenceAgeSeconds }) });
    }
  }
  return {
    schemaVersion: 1,
    feature: manifest.feature,
    releaseHash,
    generatedAt: now.toISOString(),
    status: validation.ok && results.every(result => result.ok) ? 'PASS' : 'FAIL',
    manifestErrors: validation.errors,
    results,
  };
}

export function runStaticIntegrity(options = {}) {
  const directory = options.root || root;
  const jsFiles = walkTextFiles(directory).filter(file => /\.(?:c?js|mjs)$/.test(file));
  const checks = [
    runCommandCheck('dependency-lock', ['npm', 'install', '--package-lock-only', '--ignore-scripts'], { cwd: directory, timeoutMs: 120000 }),
    runCommandCheck('dependency-audit', ['npm', 'audit', '--omit=dev', '--audit-level=high'], { cwd: directory, timeoutMs: 120000 }),
    runCommandCheck('diff-check', ['git', 'diff', '--check'], { cwd: directory }),
    ...jsFiles.map(file => runCommandCheck(`syntax:${path.relative(directory, file)}`, [process.execPath, '--check', file], { cwd: directory })),
  ];
  const secretFindings = scanSecrets(directory);
  const supabaseFindings = findSupabaseRuntimeReferences(directory);
  if (secretFindings.length) checks.push({ id: 'secret-scan', ok: false, exitCode: 1, signal: null, error: null, output: secretFindings.join('\n') });
  else checks.push({ id: 'secret-scan', ok: true, exitCode: 0, signal: null, error: null, output: '' });
  if (supabaseFindings.length) checks.push({ id: 'supabase-runtime', ok: false, exitCode: 1, signal: null, error: null, output: supabaseFindings.join('\n') });
  else checks.push({ id: 'supabase-runtime', ok: true, exitCode: 0, signal: null, error: null, output: '' });
  return { ok: checks.every(check => check.ok), checks };
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function runFromEvidence(manifestPath) {
  const manifest = loadJson(manifestPath);
  const evidenceBySuite = {};
  for (const suite of manifest.suites || []) {
    const evidencePath = path.resolve(root, suite.evidencePath);
    if (fs.existsSync(evidencePath)) evidenceBySuite[suite.id] = loadJson(evidencePath);
  }
  const report = evaluateGate(manifest, evidenceBySuite, { releaseHash: process.env.CANDIDATE_RELEASE || manifest.candidateRelease });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report.status === 'PASS' ? 0 : 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv[2] === '--static') {
    const report = runStaticIntegrity();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.ok ? 0 : 1;
  } else {
    const manifestPath = path.resolve(root, process.argv[2] || 'test/acceptance-manifest.json');
    try {
      process.exitCode = runFromEvidence(manifestPath);
    } catch (error) {
      process.stderr.write(`acceptance gate failed closed: ${error.message}\n`);
      process.exitCode = 1;
    }
  }
}
