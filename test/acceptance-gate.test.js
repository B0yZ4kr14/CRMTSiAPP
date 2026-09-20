const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function loadGate() {
  return import('../scripts/acceptance-gate.mjs');
}

function manifest(overrides = {}) {
  return {
    schemaVersion: 1,
    candidateRelease: 'release-abc',
    maxEvidenceAgeSeconds: 3600,
    requiredCoverage: ['FR-001', 'SC-001', 'PLAT-001'],
    suites: [
      {
        id: 'G01-static',
        phase: 'setup',
        required: true,
        command: ['node', '--test', 'test/example.test.js'],
        timeoutMs: 30000,
        evidencePath: 'evidence/G01-static.json',
        allowExternalBlock: false,
        requirements: ['FR-001', 'SC-001', 'PLAT-001'],
      },
    ],
    ...overrides,
  };
}

function evidence(overrides = {}) {
  return {
    schemaVersion: 1,
    suiteId: 'G01-static',
    releaseHash: 'release-abc',
    startedAt: '2026-09-19T05:00:00.000Z',
    completedAt: '2026-09-19T05:00:10.000Z',
    exitCode: 0,
    tests: { total: 4, passed: 4, failed: 0, skipped: 0, cancelled: 0, todo: 0 },
    status: 'passed',
    ...overrides,
  };
}

test('operational experience manifest maps exactly FR-001–FR-032 and SC-001–SC-012', async () => {
  const manifestPath = path.join(__dirname, 'acceptance-manifest.json');
  const value = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const expected = [
    ...Array.from({ length: 32 }, (_, index) => `FR-${String(index + 1).padStart(3, '0')}`),
    ...Array.from({ length: 12 }, (_, index) => `SC-${String(index + 1).padStart(3, '0')}`),
  ];
  assert.equal(value.feature, '005-operational-experience');
  assert.deepEqual(value.requiredCoverage, expected);
  assert.deepEqual([...new Set(value.suites.flatMap(suite => suite.requirements))].sort(), [...expected].sort());
});

test('manifest validation fails when a mandatory requirement has no suite mapping', async () => {
  const { validateManifest } = await loadGate();
  const result = validateManifest(manifest({ requiredCoverage: ['FR-001', 'FR-002'] }));
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /FR-002.*not mapped/i);
});

test('suite evidence fails closed when any mandatory test is skipped, cancelled, or todo', async () => {
  const { evaluateSuiteEvidence } = await loadGate();
  for (const counts of [
    { skipped: 1, cancelled: 0, todo: 0 },
    { skipped: 0, cancelled: 1, todo: 0 },
    { skipped: 0, cancelled: 0, todo: 1 },
  ]) {
    const result = evaluateSuiteEvidence(manifest().suites[0], evidence({ tests: { total: 4, passed: 3, failed: 0, ...counts } }), {
      now: new Date('2026-09-19T05:10:00.000Z'),
      releaseHash: 'release-abc',
      maxEvidenceAgeSeconds: 3600,
    });
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /skipped|cancelled|todo/i);
  }
});

test('suite evidence fails closed for an empty test suite', async () => {
  const { evaluateSuiteEvidence } = await loadGate();
  const result = evaluateSuiteEvidence(manifest().suites[0], evidence({ tests: { total: 0, passed: 0, failed: 0, skipped: 0, cancelled: 0, todo: 0 } }), {
    now: new Date('2026-09-19T05:10:00.000Z'),
    releaseHash: 'release-abc',
    maxEvidenceAgeSeconds: 3600,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /empty/i);
});

test('suite evidence fails closed when stale or bound to another release', async () => {
  const { evaluateSuiteEvidence } = await loadGate();
  const stale = evaluateSuiteEvidence(manifest().suites[0], evidence(), {
    now: new Date('2026-09-19T07:00:00.000Z'),
    releaseHash: 'release-abc',
    maxEvidenceAgeSeconds: 3600,
  });
  assert.equal(stale.ok, false);
  assert.match(stale.errors.join('\n'), /stale/i);

  const mismatched = evaluateSuiteEvidence(manifest().suites[0], evidence({ releaseHash: 'release-other' }), {
    now: new Date('2026-09-19T05:10:00.000Z'),
    releaseHash: 'release-abc',
    maxEvidenceAgeSeconds: 3600,
  });
  assert.equal(mismatched.ok, false);
  assert.match(mismatched.errors.join('\n'), /release/i);
});

test('static integrity scanner detects credential-like assignments but ignores public placeholders', async () => {
  const { scanSecrets } = await loadGate();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'crmtsiapp-static-'));
  try {
    fs.writeFileSync(path.join(directory, 'safe.js'), "const endpoint = 'https://example.invalid';\nconst token = 'replace-me';\n");
    assert.deepEqual(scanSecrets(directory), []);
    const syntheticToken = ['sk', 'live', '1234567890abcdef'].join('_');
    fs.writeFileSync(path.join(directory, 'unsafe.js'), `const apiToken = '${syntheticToken}';\n`);
    const findings = scanSecrets(directory);
    assert.equal(findings.length, 1);
    assert.match(findings[0], /unsafe\.js:1/);
    assert.doesNotMatch(findings[0], /sk_live/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('static integrity scanner rejects Supabase runtime dependencies and imports', async () => {
  const { findSupabaseRuntimeReferences } = await loadGate();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'crmtsiapp-supabase-'));
  try {
    const supabasePackage = '@' + 'supabase/supabase-js';
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ dependencies: { [supabasePackage]: '2.0.0' } }));
    fs.writeFileSync(path.join(directory, 'server.js'), `require('${supabasePackage}');\n`);
    const findings = findSupabaseRuntimeReferences(directory);
    assert.equal(findings.length, 2);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('command runner fails closed and reports only bounded command metadata', async () => {
  const { runCommandCheck } = await loadGate();
  const ok = runCommandCheck('node-version', [process.execPath, '--version'], { cwd: process.cwd() });
  assert.equal(ok.ok, true);
  assert.equal(ok.exitCode, 0);

  const failed = runCommandCheck('intentional-failure', [process.execPath, '-e', 'process.exit(7)'], { cwd: process.cwd() });
  assert.equal(failed.ok, false);
  assert.equal(failed.exitCode, 7);
});
