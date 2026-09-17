const CONFIGURATION_CONTRACT = [
  { domain: 'channels', scope: 'channel-workspace', status: 'channel-workspace-managed', description: 'WAHA and Meta credentials/configuration are managed per channel.' },
  { domain: 'runtime', scope: 'environment', status: 'runtime-only', description: 'Security, origin, workers and deployment settings are controlled by protected runtime configuration.' },
  { domain: 'organization', scope: 'organization', status: 'unsupported', description: 'Persistence alone is not an effective configuration; backend consumers are required.' },
  { domain: 'profile', scope: 'user', status: 'unsupported', description: 'User preferences require a profile store and renderer consumer.' },
  { domain: 'integrations', scope: 'organization', status: 'unsupported', description: 'Integrations require dedicated credential, lifecycle and runtime consumers.' },
];

function editableSettings() { return []; }
function isEditableSetting() { return false; }

module.exports = { CONFIGURATION_CONTRACT, editableSettings, isEditableSetting };
