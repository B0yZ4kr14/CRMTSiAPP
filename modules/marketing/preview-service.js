const { compileCampaignContent } = require('./content-compiler');

function createPreview({ content, channel, variables = {} }) {
  const compiled = compileCampaignContent(content, { channel, variables });
  return {
    channel: compiled.channel,
    capabilityProfileVersion: compiled.capabilityProfileVersion,
    html: compiled.html,
    text: compiled.text,
    sandbox: 'allow-scripts',
  };
}

module.exports = { createPreview };