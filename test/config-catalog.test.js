const test = require('node:test');
const assert = require('node:assert/strict');
const { CONFIG_CATALOG, renderConfigCatalog } = require('../config-catalog');

test('catalog represents every upstream configuration domain', () => {
  const domains = new Set(CONFIG_CATALOG.map((item) => item.domain));
  for (const domain of ['whatsapp', 'channels', 'organization', 'profile', 'branding', 'security', 'notifications', 'team', 'pipelines', 'routing', 'agenda', 'ads', 'commerce', 'api', 'ai', 'operations', 'privacy', 'platform']) assert.ok(domains.has(domain), `missing ${domain}`);
});

test('catalog has no Supabase runtime setting and all secrets are protected', () => {
  assert.equal(CONFIG_CATALOG.some((item) => /supabase/i.test(item.key)), false);
  assert.ok(CONFIG_CATALOG.some((item) => item.secret));
  assert.ok(CONFIG_CATALOG.filter((item) => item.secret).every((item) => item.runtimeOnly));
});

test('catalog displays all configuration categories without exposing secret values or false save controls', () => {
  const html = renderConfigCatalog({ whatsapp_provider: 'waha', app_name: 'CRMTSiAPP' });
  assert.match(html, /Mapa de configurações/);
  assert.match(html, /WhatsApp e canais/);
  assert.match(html, /IA e automações/);
  assert.match(html, /Configurações sem efeito não são graváveis/);
  assert.match(html, /WAHA compatível/);
  assert.doesNotMatch(html, /SUPABASE_SERVICE_ROLE_KEY|WAHA_API_KEY=|action="\/settings\/catalog"/);
});
