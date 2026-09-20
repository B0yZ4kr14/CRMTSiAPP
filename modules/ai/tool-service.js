class ToolSafetyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ToolSafetyError';
    this.code = code;
    this.statusCode = code === 'AI_TOOL_FORBIDDEN' ? 403 : 400;
  }
}

function fail(code, message) {
  throw new ToolSafetyError(code, message);
}

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasCapability(context, capability) {
  return context.capabilities.includes('*') || context.capabilities.includes(capability);
}

function validateInput(definition, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('AI_TOOL_INPUT_INVALID', 'tool input must be an object');
  const allowed = new Set(definition.inputKeys || []);
  const keys = Object.keys(input);
  if (keys.length !== allowed.size || keys.some(key => !allowed.has(key)) || keys.some(key => !asText(input[key]))) {
    fail('AI_TOOL_INPUT_INVALID', 'tool input does not match the registered contract');
  }
  return Object.freeze(Object.fromEntries(keys.map(key => [key, asText(input[key])])));
}

function createToolService({ tools = {}, clock = () => new Date() } = {}) {
  const registry = new Map(Object.entries(tools));
  const previews = new Map();
  const operations = new Map();

  function key(context, idempotencyKey) {
    const normalized = asText(idempotencyKey);
    if (!normalized) fail('AI_TOOL_IDEMPOTENCY_REQUIRED', 'idempotency key is required');
    return `${context.tenantId}:${normalized}`;
  }

  async function preview(context, request = {}) {
    const tool = asText(request.tool);
    const definition = registry.get(tool);
    if (!definition) fail('AI_TOOL_NOT_ALLOWED', 'tool is not allowlisted');
    if (!hasCapability(context, definition.capability)) fail('AI_TOOL_FORBIDDEN', 'actor is not authorized for this tool');
    const input = validateInput(definition, request.input);
    const operationKey = key(context, request.idempotencyKey);
    const existing = operations.get(operationKey);
    if (existing) return existing.preview;
    const id = `${context.requestId}:${tool}:${operationKey}`;
    const value = Object.freeze({
      id,
      tool,
      tenantId: context.tenantId,
      actorId: context.actorId,
      input,
      idempotencyKey: asText(request.idempotencyKey),
      requiresConfirmation: Boolean(definition.irreversible),
      confirmation: definition.irreversible ? `confirm:${id}` : null,
      createdAt: clock().toISOString(),
    });
    previews.set(id, { definition, context, operationKey, preview: value });
    return value;
  }

  async function execute(context, request = {}) {
    const previewId = asText(request.previewId);
    const registered = previews.get(previewId);
    if (!registered || registered.context.tenantId !== context.tenantId || registered.context.actorId !== context.actorId) {
      fail('AI_TOOL_PREVIEW_INVALID', 'preview does not belong to this operation context');
    }
    const operationKey = key(context, request.idempotencyKey);
    if (operationKey !== registered.operationKey) fail('AI_TOOL_IDEMPOTENCY_MISMATCH', 'idempotency key does not match preview');
    const existing = operations.get(operationKey);
    if (existing?.result) return existing.result;
    if (registered.preview.requiresConfirmation && asText(request.confirmation) !== registered.preview.confirmation) {
      fail('AI_TOOL_CONFIRMATION_REQUIRED', 'irreversible tool requires exact preview confirmation');
    }
    const response = await registered.definition.execute(registered.preview.input, Object.freeze({
      tenantId: context.tenantId,
      actorId: context.actorId,
      requestId: context.requestId,
      tool: registered.preview.tool,
    }));
    const unknown = response?.outcome === 'unknown';
    const result = Object.freeze({
      idempotencyKey: registered.preview.idempotencyKey,
      tool: registered.preview.tool,
      tenantId: context.tenantId,
      status: unknown ? 'reconciliation_required' : 'completed',
      outcome: unknown ? 'unknown' : 'completed',
      retryAllowed: !unknown,
      value: response?.value,
      reason: unknown ? asText(response.reason) || 'unknown tool outcome' : null,
      completedAt: clock().toISOString(),
    });
    operations.set(operationKey, { preview: registered.preview, result });
    return result;
  }

  async function getOperation(context, idempotencyKey) {
    return operations.get(key(context, idempotencyKey))?.result || null;
  }

  return Object.freeze({ preview, execute, getOperation });
}

module.exports = { createToolService, ToolSafetyError };
