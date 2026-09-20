const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv } = require('../modules/crm/import-service');

test('import service parses and maps CSV records idempotently', () => {
  const csv = 'name,email\nAna,ana@example.com\n';
  const records = parseCsv(csv);
  assert.equal(records.length, 1);
  assert.equal(records[0].name, 'Ana');
  assert.equal(records[0].email, 'ana@example.com');
});
