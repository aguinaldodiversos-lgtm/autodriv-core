const pool = require("../config/db");
const { getRedis, pingRedis } = require("../config/redis");

/**
 * Logica reutilizavel e testavel (deps injectavel).
 * Postgres e obrigatorio. Redis e opcional por padrao e exigido quando
 * `REDIS_REQUIRED=true` ou quando `REDIS_URL` estiver definido.
 *
 * @param {object} [deps]
 * @param {() => Promise<unknown>} [deps.query] default: pool "SELECT 1"
 * @param {() => Promise<unknown>} [deps.pingRedis] default: módulo redis (via getRedis+ping)
 * @param {string} [deps.nodeEnv]
 * @param {string|null|undefined} [deps.redisUrl]
 * @returns {Promise<{ statusCode: number, body: object }>}
 */
async function runReadinessCheck(deps = {}) {
  const runQuery = deps.query || (() => pool.query("SELECT 1"));

  async function defaultPing() {
    const r = getRedis();
    if (!r) {
      return null;
    }
    return pingRedis();
  }

  const doPing = deps.pingRedis || defaultPing;
  const nodeEnv = deps.nodeEnv !== undefined ? deps.nodeEnv : process.env.NODE_ENV;
  const redisUrl =
    deps.redisUrl !== undefined ? deps.redisUrl : process.env.REDIS_URL;
  const redisRequiredFlag =
    deps.redisRequired !== undefined
      ? deps.redisRequired
      : process.env.REDIS_REQUIRED === "true";

  const redisUrlPresent = Boolean(redisUrl && String(redisUrl).trim());
  const redisRequired = Boolean(redisRequiredFlag) || redisUrlPresent;

  const now = () => new Date().toISOString();

  const body = {
    status: "not_ready",
    service: "autodriv-core",
    timestamp: now(),
    checks: {
      database: { ok: false, required: true },
      redis: { ok: false, required: redisRequired }
    }
  };

  const tDb = Date.now();
  try {
    await runQuery();
    body.checks.database = {
      ok: true,
      required: true,
      latency_ms: Date.now() - tDb
    };
  } catch (err) {
    body.checks.database = {
      ok: false,
      required: true,
      error: err.message
    };
    body.error = err.message;
    body.timestamp = now();
    return { statusCode: 503, body };
  }

  if (!redisRequired) {
    body.checks.redis = {
      ok: true,
      required: false,
      skipped: true,
      reason: "REDIS_URL nao definido; Redis opcional para este ambiente"
    };
    body.status = "ready";
    body.timestamp = now();
    return { statusCode: 200, body };
  }

  if (redisRequired && !redisUrlPresent) {
    const msg = "REDIS_URL obrigatorio quando REDIS_REQUIRED=true";
    body.checks.redis = {
      ok: false,
      required: true,
      error: msg
    };
    body.error = msg;
    body.timestamp = now();
    return { statusCode: 503, body };
  }

  const tR = Date.now();
  let pongLike;
  try {
    pongLike = await doPing();
  } catch (err) {
    body.checks.redis = {
      ok: false,
      required: true,
      error: err.message
    };
    body.error = err.message;
    body.timestamp = now();
    return { statusCode: 503, body };
  }

  if (pongLike !== true && pongLike !== "PONG") {
    const msg = "Redis indisponível ou não respondeu a PING";
    body.checks.redis = {
      ok: false,
      required: true,
      error: msg
    };
    body.error = msg;
    body.timestamp = now();
    return { statusCode: 503, body };
  }

  body.checks.redis = {
    ok: true,
    required: true,
    latency_ms: Date.now() - tR
  };
  body.status = "ready";
  body.timestamp = now();
  delete body.error;
  return { statusCode: 200, body };
}

module.exports = { runReadinessCheck };
