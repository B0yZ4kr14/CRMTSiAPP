const { claimIdempotency, resolveIdempotency } = require('../shared/idempotency-service');

function operationError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function createOperationRunner(options = {}) {
  const withTransaction = options.withTransaction || (async fn => fn(options.client));

  async function run(context, effect) {
    if (!context?.tenantId || !context?.actorId || !context?.key || !context?.operation) {
      throw operationError('OPERATION_CONTEXT_REQUIRED');
    }

    return withTransaction(async client => {
      const claim = await claimIdempotency(client, {
        tenantId: context.tenantId,
        key: context.key,
        operation: context.operation,
        request: context.request,
      });

      if (!claim.claimed) {
        if (claim.record.status === 'completed') {
          return { replayed: true, status: claim.record.response_status, result: claim.record.response_body };
        }
        if (claim.record.status === 'processing') throw operationError('OPERATION_IN_PROGRESS');
        throw operationError('OPERATION_PREVIOUSLY_FAILED');
      }

      const result = await effect({ client, context });
      await resolveIdempotency(client, {
        tenantId: context.tenantId,
        key: context.key,
        operation: context.operation,
        responseStatus: 200,
        responseBody: result,
      });
      return { replayed: false, status: 200, result };
    });
  }

  return { run };
}

module.exports = { createOperationRunner };