const test = require('node:test');
const assert = require('node:assert/strict');
const { redact } = require('../modules/shared/redaction');
const { redactValue } = require('../modules/cli/output');
const { renderResult, renderError } = require('../modules/cli/output');
const { compileCampaignContent } = require('../modules/marketing/content-compiler');

const CANARIES = ['password-canary-us4', 'token-canary-us4', 'api-key-canary-us4', 'ciphertext-canary-us4'];

test('secret canaries are redacted across operation, CLI and provider domains', () => {
  const operational = redact({ password: CANARIES[0], nested: { accessToken: CANARIES[1], ciphertext: CANARIES[3] } });
  const cli = redactValue({ apiKey: CANARIES[2], token: CANARIES[1], safe: 'visible' });
  const rendered = `${renderResult({ secret: CANARIES[0] }, { json: true })}${renderError(Object.assign(new Error(CANARIES[1]), { details: { apiKey: CANARIES[2] } }), { json: true })}`;
  const compiled = compileCampaignContent({ blocks: [{ type: 'paragraph', text: '<script>canary</script>' }] }, { channel: 'waha' });
  const serialized = `${JSON.stringify(operational)}${JSON.stringify(cli)}${rendered}`;
  for (const canary of CANARIES) assert.doesNotMatch(serialized, new RegExp(canary));
  assert.match(compiled.html, /&lt;script&gt;/);
  assert.equal(cli.safe, 'visible');
});