const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTimeline } = require('../modules/crm/timeline-service');

test('timeline service aggregates events in chronological order', () => {
  const events = [
    { id: 2, createdAt: new Date('2026-09-19T02:00:00.000Z') },
    { id: 1, createdAt: new Date('2026-09-19T01:00:00.000Z') }
  ];
  const sorted = buildTimeline(events);
  assert.equal(sorted[0].id, 1);
  assert.equal(sorted[1].id, 2);
});
