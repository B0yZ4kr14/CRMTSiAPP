const sentCampaigns = new Set();

function dispatchKey({ campaignId, campaignVersion, capabilityProfileVersion }) {
  if (!campaignId || !Number.isInteger(campaignVersion) || campaignVersion < 1 || !Number.isInteger(capabilityProfileVersion) || capabilityProfileVersion < 1) {
    const error = new Error('PUBLISHED_VERSION_REQUIRED');
    error.code = 'PUBLISHED_VERSION_REQUIRED';
    throw error;
  }
  return `${campaignId}:${campaignVersion}:${capabilityProfileVersion}`;
}

function dispatchCampaign({ campaignId, campaignVersion = 1, capabilityProfileVersion = 1, recipients }) {
  const key = dispatchKey({ campaignId, campaignVersion, capabilityProfileVersion });
  if (sentCampaigns.has(key)) return { sent: 0, campaignId, campaignVersion, capabilityProfileVersion };
  sentCampaigns.add(key);
  return { sent: recipients.length, campaignId, campaignVersion, capabilityProfileVersion };
}

module.exports = { dispatchCampaign, dispatchKey };
