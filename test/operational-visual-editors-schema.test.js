const test = require('node:test');
const assert = require('node:assert/strict');
const { operationalExperienceMigration } = require('../domain-schema');

test('operational migration provisions immutable automation and campaign drafts, versions and version FKs', () => {
  const sql = operationalExperienceMigration();
  for (const table of ['automation_drafts', 'automation_versions', 'campaign_drafts', 'campaign_versions', 'channel_capability_profiles']) {
    assert.match(sql, new RegExp(`create table if not exists ${table}`));
  }
  assert.match(sql, /automation_version_id uuid references automation_versions\(id\)/);
  assert.match(sql, /campaign_version_id uuid references campaign_versions\(id\)/);
  assert.match(sql, /unique\(tenant_id,automation_id,version\)/);
  assert.match(sql, /unique\(tenant_id,campaign_id,version\)/);
  assert.match(sql, /create trigger automation_versions_immutable before update or delete on automation_versions/);
  assert.match(sql, /create trigger campaign_versions_immutable before update or delete on campaign_versions/);
});