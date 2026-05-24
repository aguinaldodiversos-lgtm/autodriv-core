/**
 * Readiness: política por ambiente, estrutura de checks, produção.
 */
const assert = require("assert");
const { test, describe } = require("node:test");
const path = require("path");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const { runReadinessCheck } = require(path.join("..", "src", "health", "readiness"));

describe("runReadinessCheck (injectado, sem I/O real)", () => {
  test("producao sem REDIS_URL: 200 e redis skipped quando opcional", async () => {
    const r = await runReadinessCheck({
      nodeEnv: "production",
      redisUrl: null,
      query: async () => {},
      pingRedis: async () => true
    });
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.status, "ready");
    assert.strictEqual(r.body.checks.database.ok, true);
    assert.strictEqual(r.body.checks.redis.skipped, true);
    assert.strictEqual(r.body.checks.redis.required, false);
  });

  test("REDIS_REQUIRED=true sem REDIS_URL: 503", async () => {
    const r = await runReadinessCheck({
      nodeEnv: "production",
      redisUrl: null,
      redisRequired: true,
      query: async () => {},
      pingRedis: async () => true
    });
    assert.strictEqual(r.statusCode, 503);
    assert.strictEqual(r.body.status, "not_ready");
    assert.strictEqual(r.body.checks.redis.required, true);
    assert.match(r.body.error, /REDIS_URL/);
  });

  test("produção com redis configurado indisponível: 503", async () => {
    const r = await runReadinessCheck({
      nodeEnv: "production",
      redisUrl: "redis://127.0.0.1:9",
      query: async () => {},
      pingRedis: async () => null
    });
    assert.strictEqual(r.statusCode, 503);
    assert.match(String(r.body.checks.redis.error || r.body.error), /PING|Redis/);
  });

  test("produção: ping falha com exceção -> 503", async () => {
    const r = await runReadinessCheck({
      nodeEnv: "production",
      redisUrl: "redis://x:6379",
      query: async () => {},
      pingRedis: async () => {
        throw new Error("redis recusou");
      }
    });
    assert.strictEqual(r.statusCode, 503);
    assert.match(r.body.error, /redis recusou/);
  });

  test("produção: postgres falha -> 503 antes de redis", async () => {
    const r = await runReadinessCheck({
      nodeEnv: "production",
      redisUrl: "redis://x:6379",
      query: async () => {
        throw new Error("db down");
      },
      pingRedis: async () => true
    });
    assert.strictEqual(r.statusCode, 503);
    assert.strictEqual(r.body.checks.database.ok, false);
  });

  test("produção: DB + PONG -> 200", async () => {
    const r = await runReadinessCheck({
      nodeEnv: "production",
      redisUrl: "redis://x:6379",
      query: async () => {},
      pingRedis: async () => true
    });
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.status, "ready");
    assert.strictEqual(r.body.checks.redis.ok, true);
  });

  test("não produção, sem redis url: 200, redis skipped", async () => {
    const r = await runReadinessCheck({
      nodeEnv: "development",
      redisUrl: null,
      query: async () => {},
      pingRedis: async () => null
    });
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.checks.redis.skipped, true);
  });
});

test("producao: carregar config/env sem REDIS_URL nao aborta por padrao", () => {
  const envPath = require.resolve(path.join("..", "src", "config", "env"));
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    REDIS_URL: process.env.REDIS_URL
  };

  try {
    delete require.cache[envPath];
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgres://a:a@127.0.0.1:1/db";
    process.env.JWT_SECRET = "0".repeat(32);
    process.env.CORS_ORIGIN = "https://exemplo.invalid";
    delete process.env.REDIS_URL;

    const env = require(envPath);
    assert.strictEqual(env.REDIS_URL, null);
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    delete require.cache[envPath];
    require(envPath);
  }
});

test("CORS_ORIGIN ausente ou sentinela mantém API privada", () => {
  const { parseCorsOrigins } = require(path.join("..", "src", "config", "env"));

  assert.strictEqual(parseCorsOrigins(), null);
  assert.strictEqual(parseCorsOrigins("server-to-server"), null);
  assert.strictEqual(parseCorsOrigins("private"), null);
  assert.strictEqual(parseCorsOrigins("disabled"), null);
  assert.deepStrictEqual(parseCorsOrigins("https://app.example, https://admin.example"), [
    "https://app.example",
    "https://admin.example"
  ]);
});
