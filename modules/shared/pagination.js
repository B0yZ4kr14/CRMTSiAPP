function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor) {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
}

module.exports = { encodeCursor, decodeCursor };
