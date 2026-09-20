function normalizeIdentity({ email, phone }) {
  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
  const normalizedPhone = phone ? String(phone).replace(/\D/g, '') : null;
  return { email: normalizedEmail, phone: normalizedPhone };
}

module.exports = { normalizeIdentity };
