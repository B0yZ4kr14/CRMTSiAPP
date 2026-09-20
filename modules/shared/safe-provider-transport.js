const { Agent } = require('undici');

function createSafeDispatcher() {
  return new Agent({
    connect: {
      rejectUnauthorized: true,
    }
  });
}

module.exports = { createSafeDispatcher };
