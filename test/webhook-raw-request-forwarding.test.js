const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../server'), 'utf8');

test('HTTP webhook routes forward the original Node request headers to signature verification', () => {
  assert.match(source, /channelWebhooks\.receive\(\{\.\.\.req,headers:req\.headers,body,rawBody\}/);
});
