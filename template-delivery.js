function parseTemplateVariables(value, expectedCount) {
  const count = Number(expectedCount);
  if (!Number.isInteger(count) || count < 0 || count > 100) throw new Error('quantidade de variáveis inválida');
  const variables = String(value || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  if (variables.length !== count) throw new Error(`quantidade de variáveis deve ser ${count}`);
  if (variables.some(item => item.length > 1024)) throw new Error('variável excede o limite');
  return variables;
}

function templateMessageBody(name) {
  return `Template: ${String(name || '').trim()}`;
}

module.exports = { parseTemplateVariables, templateMessageBody };
