const fs = require('node:fs');

const FORBIDDEN_ARG_KEYS = new Set(['password', 'secret', 'token', 'accessToken', 'apiKey', 'appSecret', 'verifyToken', 'webhookToken']);

function error(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

function validateSecretInputOptions(options = {}) {
  for (const key of FORBIDDEN_ARG_KEYS) {
    if (options[key] !== undefined && options[key] !== null) throw error('SECRET_IN_ARGV');
  }
  if (options.secretFd !== undefined) {
    const fd = Number(options.secretFd);
    if (!Number.isInteger(fd) || fd < 3) throw error('SECRET_FD_INVALID');
  }
  return true;
}

async function readSecretFromStream(stream, options = {}) {
  const maxBytes = options.maxBytes || 8192;
  let bytes = 0;
  const chunks = [];
  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) throw error('SECRET_TOO_LARGE');
    chunks.push(buffer);
  }
  const secret = Buffer.concat(chunks).toString('utf8').replace(/[\r\n]+$/, '');
  if (!secret) throw error('SECRET_REQUIRED');
  return secret;
}

async function readSecretFromFd(fd, options = {}) {
  validateSecretInputOptions({ secretFd: fd });
  const stream = fs.createReadStream(null, { fd, autoClose: false });
  return readSecretFromStream(stream, options);
}

async function readSecretFromStdin(options = {}) {
  return readSecretFromStream(process.stdin, options);
}

module.exports = { FORBIDDEN_ARG_KEYS, validateSecretInputOptions, readSecretFromStream, readSecretFromFd, readSecretFromStdin };