const Redis = require("ioredis");

let client = null;

/**
 * Cliente Redis compartilhado (ex.: rate limiting). BullMQ usa conexões próprias.
 */
function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 20,
      enableReadyCheck: true,
      lazyConnect: false
    });
  }
  return client;
}

async function closeRedis() {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    // ignore
  }
  client = null;
}

module.exports = { getRedis, closeRedis };
