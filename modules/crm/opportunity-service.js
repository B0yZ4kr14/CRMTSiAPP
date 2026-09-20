function validateOpportunity(opp) {
  return Boolean(opp.pipelineId && opp.stage);
}

module.exports = { validateOpportunity };
