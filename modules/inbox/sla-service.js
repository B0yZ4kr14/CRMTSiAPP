function calculateBreach(deadline) {
  return new Date() > deadline;
}

module.exports = { calculateBreach };
