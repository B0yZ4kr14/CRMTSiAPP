function buildTimeline(events) {
  return events.sort((a, b) => a.createdAt - b.createdAt);
}

module.exports = { buildTimeline };
