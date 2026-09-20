function reconcileCampaignMetrics(attempts = []) {
  return attempts.reduce((acc, curr) => {
    acc.total += 1;
    if (curr.success) acc.successes += 1;
    else acc.failures += 1;
    return acc;
  }, { total: 0, successes: 0, failures: 0 });
}

module.exports = { reconcileCampaignMetrics };
