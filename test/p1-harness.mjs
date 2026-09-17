// Minimal reproduction harness for P1 findings.
// Usage: node test/p1-harness.mjs [P1-01|P1-02|P1-03|P1-04]
import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = process.cwd();

function loadModule(file) {
  const code = readFileSync(new URL(file, `file://${root}/`), 'utf8');
  return { code, file };
}

function find(pattern, file) {
  const lines = file.split('\n');
  return lines.filter(l => pattern.test(l)).map((l, i) => ({ line: i + 1, text: l.trim() }));
}

const results = [];

// ---------- P1-01: webhook processing not transactional nor deduplicated ----------
function checkP1_01() {
  const proc = loadModule('webhook-processor.js');
  const hasUniqueConstraint = /UNIQUE.*provider_event_id|unique.*provider_event_id|provider_event_id.*unique/i.test(proc.code);
  const hasTransactional = /begin|transaction|atomic|dedup|duplicate.*check|ON CONFLICT.*conversation/i.test(proc.code);
  const issues = [];
  if (!hasUniqueConstraint) issues.push('webhook-processor.js: no provider_event_id uniqueness/dedup check');
  if (!hasTransactional) issues.push('webhook-processor.js: processInbound runs independent queries without atomicity');
  return { pass: issues.length === 0, issues };
}

// ---------- P1-02: reads not fail-closed by capability/scope ----------
function checkP1_02() {
  const server = loadModule('server.js');
  const auth = loadModule('authorization.js');
  const routeCaps = loadModule('route-capabilities.js');
  const ensureInInbox = /\/inbox.*ensureAuthorized|ensureAuthorized.*\/inbox|inbox.*ensureAuthorized/si.test(server.code);
  const scopeEnforced = /scope.*mine|mine.*scope|assigned_user_id.*filter|scope=mine/i.test(server.code);
  const adminFirst = /effectiveRole.*admin.*first|admin.*assignedRoles|assignedRoles.*admin/i.test(auth.code);
  const issues = [];
  if (!ensureInInbox) issues.push('server.js: /inbox and /inbox/:id do not call ensureAuthorized');
  if (!scopeEnforced) issues.push('server.js: scope=mine is not enforced as mandatory policy');
  if (!adminFirst) issues.push('authorization.js: effectiveRole does not prioritize admin in array_agg');
  return { pass: issues.length === 0, issues };
}

// ---------- P1-03: SSRF DNS-safe ----------
function checkP1_03() {
  const server = loadModule('server.js');
  const adapter = loadModule('channel-adapter.js');
  const resolvesDns = /dnsLookup|lookup|resolve|dns\.resolve|dnsLookupSync/i.test(server.code) || /dnsLookup|lookup|resolve/i.test(adapter.code);
  const rebindSafe = /rebind|dns.resolve|DNS_RESOLVE|safeResolve|resolvedIps|checkDNS/i.test(server.code);
  const issues = [];
  if (!resolvesDns) issues.push('server.js/channel-adapter.js: isTrustedUrl does not resolve DNS');
  if (!rebindSafe) issues.push('server.js/channel-adapter.js: no DNS-rebinding protection on channel endpoints');
  return { pass: issues.length === 0, issues };
}

// ---------- P1-04: Meta template timeout/validation ----------
function checkP1_04() {
  const adapter = loadModule('channel-adapter.js');
  const server = loadModule('server.js');
  const tmplUsesTimeout = /sendTemplate.*requestOptions|sendTemplate.*AbortSignal|sendTemplate.*timeout/i.test(adapter.code);
  const tmplValidatesId = /sendTemplate.*providerMessageId|providerMessageId.*sendTemplate/i.test(adapter.code);
  const issues = [];
  if (!tmplUsesTimeout) issues.push('channel-adapter.js: MetaAdapter.sendTemplate does not use timeout wrapper');
  if (!tmplValidatesId) issues.push('channel-adapter.js: MetaAdapter.sendTemplate does not validate providerMessageId');
  return { pass: issues.length === 0, issues };
}

const checks = { 'P1-01': checkP1_01, 'P1-02': checkP1_02, 'P1-03': checkP1_03, 'P1-04': checkP1_04 };
const target = process.argv[2];
if (!target || !checks[target]) {
  console.log('Usage: node test/p1-harness.mjs [P1-01|P1-02|P1-03|P1-04]');
  process.exit(2);
}
const result = checks[target]();
console.log(JSON.stringify({ check: target, pass: result.pass, issues: result.issues }, null, 2));
process.exit(result.pass ? 0 : 1);