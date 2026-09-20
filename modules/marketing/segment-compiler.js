function validateExpression(expr) {
  if (!expr || typeof expr !== 'object') throw new Error('invalid expression');
  if (!['leads.value', 'contacts.name'].includes(expr.field)) throw new Error('invalid field');
  return true;
}
module.exports = { validateExpression };
