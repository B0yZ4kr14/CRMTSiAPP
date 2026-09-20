const { createSetupService } = require('./setup-service');
const { createProviderService } = require('../providers/provider-service');
const { createProviderMigration } = require('../providers/provider-migration');

function createSetupRoutes(pool, options = {}) {
  const { masterKey, bootstrapSecret } = options;

  const setupService = createSetupService(pool, { masterKey });
  const providerService = createProviderService(pool, { masterKey });
  const providerMigration = createProviderMigration(pool, { masterKey });

  return {
    async getSetupStatus(req, res, user) {
      try {
        const status = await setupService.getSetupStatus(user.tenantId);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(status));
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: e.message } }));
      }
    },

    async bootstrapSetup(req, res, user) {
      try {
        const body = JSON.parse(req.body || '{}');
        const result = await setupService.bootstrap(user.tenantId, {
          secret: body.secret,
          bootstrapSecret: bootstrapSecret,
        });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message === 'ALREADY_BOOTSTRAPPED' ? 409 : 400;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },

    async setDraftConfig(req, res, user) {
      try {
        const body = JSON.parse(req.body || '{}');
        const result = await setupService.setDraftConfig(user.tenantId, user.id, body.config);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message === 'ACTIVATION_CLOSED' ? 409 : e.message === 'NOT_BOOTSTRAPPED' ? 409 : 400;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },

    async validateDraft(req, res, user) {
      try {
        const result = await setupService.validateDraft(user.tenantId, user.id);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message === 'VALIDATION_RATE_EXCEEDED' ? 429 : e.message === 'NO_DRAFT_TO_VALIDATE' ? 409 : 400;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },

    async activateSetup(req, res, user) {
      try {
        const result = await setupService.activate(user.tenantId, user.id);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message === 'INVALID_STATE_FOR_ACTIVATION' || e.message === 'NO_DRAFT_TO_VALIDATE' ? 409 : 400;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },

    async rotateBootstrapSecret(req, res, user) {
      try {
        const body = JSON.parse(req.body || '{}');
        await setupService.rotateBootstrapSecret(user.tenantId, user.id, body);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        const status = e.message === 'BOOTSTRAP_SECRET_INVALID' ? 400 : 400;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },

    async migrateProviders(req, res, user) {
      try {
        const body = JSON.parse(req.body || '{}');
        let result;
        if (body.source === 'channels') {
          result = await providerMigration.migrateLegacyChannels(user.tenantId, user.id);
        } else if (body.source === 'settings') {
          result = await providerMigration.migrateLegacySettings(user.tenantId, user.id);
        } else {
          throw new Error('INVALID_SOURCE');
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },
  };
}

function createProviderRoutes(pool, options = {}) {
  const { masterKey, testTimeout } = options;

  const providerService = createProviderService(pool, { masterKey, testTimeout });

  return {
    async listProviders(req, res, user) {
      try {
        const providers = await providerService.listProviders(user.tenantId);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(providers));
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: e.message } }));
      }
    },

    async getProvider(req, res, user) {
      try {
        const provider = req.params?.provider || (new URL(req.url, 'http://x').searchParams.get('provider'));
        const result = await providerService.getProvider(user.tenantId, provider);
        if (!result) {
          res.writeHead(404, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Provider not found' } }));
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: e.message } }));
      }
    },

    async createProvider(req, res, user) {
      try {
        const body = JSON.parse(req.body || '{}');
        const result = await providerService.createProvider(user.tenantId, user.id, body.provider, body.config, body.credentials);
        res.writeHead(201, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message === 'PROVIDER_NOT_ALLOWLISTED' ? 400 : 400;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },

    async activateProvider(req, res, user) {
      try {
        const provider = req.params?.provider || (new URL(req.url, 'http://x').searchParams.get('provider'));
        const result = await providerService.activateProvider(user.tenantId, user.id, provider);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message === 'NOT_FOUND' ? 404 : e.message === 'ALREADY_ACTIVE' || e.message === 'INVALID_STATE_FOR_ACTIVATION' ? 409 : 400;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },

    async deactivateProvider(req, res, user) {
      try {
        const provider = req.params?.provider || (new URL(req.url, 'http://x').searchParams.get('provider'));
        const result = await providerService.deactivateProvider(user.tenantId, user.id, provider);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message === 'NOT_FOUND' ? 404 : e.message === 'NOT_ACTIVE' ? 409 : 400;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },

    async rotateCredentials(req, res, user) {
      try {
        const body = JSON.parse(req.body || '{}');
        const result = await providerService.rotateCredentials(user.tenantId, user.id, body.provider, body.credentials);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },

    async testProvider(req, res, user) {
      try {
        const provider = req.params?.provider || (new URL(req.url, 'http://x').searchParams.get('provider'));
        const result = await providerService.testProvider(user.tenantId, provider);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message === 'NOT_FOUND' ? 404 : 400;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: e.message, message: e.message } }));
      }
    },

    async getAllowedProviders(req, res, user) {
      try {
        const providers = await providerService.getAllowedProvidersList();
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(providers));
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: e.message } }));
      }
    },
  };
}

module.exports = { createSetupRoutes, createProviderRoutes };