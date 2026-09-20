function validateOidcToken(token) {
  return token.iss === 'https://issuer.example';
}

module.exports = { validateOidcToken };
