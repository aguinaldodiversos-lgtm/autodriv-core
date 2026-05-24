const Redis = require("ioredis");
const { REDIS_URL } = require("./env");

let client = null;

/**
 * Cliente Redis compartilhado (ex.: rate limiting). BullMQ usa conexões próprias.
 */
function getRedis() {
  const url = REDIS_URL;
  if (!url) {
    return null;
  }
  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 20,
      enableReadyCheck: true,
      lazyConnect: false
    });
    client.on("error", (err) => {
      console.warn("[redis] conexao indisponivel:", err.message);
    });
  }
  return client;
}

async function pingRedis() {
  const redis = getRedis();
  if (!redis) return null;

  const timeoutMs = parseInt(process.env.REDIS_HEALTH_TIMEOUT_MS || "1500", 10);
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 1500;
  let timer = null;
  const result = await Promise.race([
    redis.ping(),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Redis health timeout after ${timeout}ms`)),
        timeout
      );
    })
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });

  return result === "PONG";
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

module.exports = { getRedis, pingRedis, closeRedis };
