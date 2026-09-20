const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWorkspace } = require('../workspace');

test('settings automation surface should contain rule configuration form', () => {
  const html = renderWorkspace('settings/automation', {});
  // Deve haver um formulário para criação de regra
  assert.match(html, /<form.*action="\/settings\/automation"/);
  assert.match(html, /name="rule_name"/);
  assert.match(html, /name="rule_trigger"/);
});

test('settings privacy surface renders canonical persisted requests and audit events', () => {
  const html = renderWorkspace('settings/privacy', {
    privacyRequests: [{ contact_phone: '5511999999999', kind: 'export', status: 'open', created_at: '2026-09-18T00:00:00Z' }],
    auditEvents: [{ id: 'audit-1', action: 'privacy.export_requested', resource_type: 'privacy_request', created_at: '2026-09-18T00:00:00Z' }],
  });
  assert.match(html, /<table/);
  assert.match(html, /5511999999999/);
  assert.match(html, /privacy\.export_requested/);
});
