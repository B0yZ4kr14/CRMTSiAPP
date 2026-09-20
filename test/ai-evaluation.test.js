const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCorpus } = require('../modules/ai/eval-service');
const corpus = require('./fixtures/ai-evaluation-ptbr.json');

test('ai evaluation gate passes synthetic pt-br corpus', () => {
  const result = evaluateCorpus(corpus);
  assert.equal(result.passed, true);
});
