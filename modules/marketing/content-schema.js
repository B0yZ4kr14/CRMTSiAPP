const BLOCK_TYPES = new Set(['paragraph', 'heading', 'button', 'image', 'divider']);
const MARK_TYPES = new Set(['bold', 'italic', 'code']);
const VARIABLES = new Set(['contact.name', 'contact.id', 'contact.phone', 'company.name']);
const MAX_BLOCKS = 100;
const MAX_TEXT_LENGTH = 4000;

function contentError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function variablesIn(text) {
  return [...String(text || '').matchAll(/\{\{([a-z]+\.[a-z]+)\}\}/g)].map(match => match[1]);
}

function normalizeBlock(block) {
  if (!block || typeof block !== 'object' || !BLOCK_TYPES.has(block.type)) throw contentError('CONTENT_BLOCK_UNSUPPORTED');
  const text = String(block.text || '');
  if (text.length > MAX_TEXT_LENGTH) throw contentError('CONTENT_TEXT_TOO_LONG');
  const marks = [...new Set(block.marks || [])].sort();
  if (!marks.every(mark => MARK_TYPES.has(mark))) throw contentError('CONTENT_MARK_UNSUPPORTED');
  for (const variable of variablesIn(text)) if (!VARIABLES.has(variable)) throw contentError('CONTENT_VARIABLE_UNSUPPORTED');
  const normalized = { type: block.type, text, marks };
  if (block.url !== undefined) normalized.url = String(block.url);
  return normalized;
}

function normalizeCampaignContent(content) {
  if (!content || !Array.isArray(content.blocks)) throw contentError('CONTENT_BLOCKS_INVALID');
  if (content.blocks.length > MAX_BLOCKS) throw contentError('CONTENT_BLOCKS_TOO_MANY');
  return { blocks: content.blocks.map(normalizeBlock) };
}

function validateCampaignContent(content) {
  try {
    return { valid: true, content: normalizeCampaignContent(content) };
  } catch (error) {
    return { valid: false, error: error.code || 'CONTENT_INVALID' };
  }
}

module.exports = { BLOCK_TYPES, MARK_TYPES, VARIABLES, MAX_BLOCKS, MAX_TEXT_LENGTH, variablesIn, normalizeBlock, normalizeCampaignContent, validateCampaignContent };