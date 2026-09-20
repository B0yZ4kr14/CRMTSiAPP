const { drainQueue } = require('../../../modules/operations/job-store');

async function drainQueues({ pool, tenantId, args }) {
  if (!tenantId) {
    const error = new Error('OPERATION_CONTEXT_REQUIRED');
    error.code = 'OPERATION_CONTEXT_REQUIRED';
    throw error;
  }

  const timeoutMs = Number(args.timeoutMs ?? args.timeout ?? 30000);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300000) {
    const error = new Error('VALIDATION_ERROR');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  return drainQueue(pool, tenantId, { timeoutMs });
}

module.exports = { drainQueues };