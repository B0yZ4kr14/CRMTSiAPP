function validateField({ type, value }) {
  if (type === 'number') {
    return !isNaN(Number(value));
  }
  return true;
}

module.exports = { validateField };
