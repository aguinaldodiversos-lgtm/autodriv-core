const { test } = require("node:test");
const assert = require("node:assert");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}

const request = require("supertest");
const app = require("../src/app");

test("GET /health", async () => {
  const res = await request(app).get("/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, "ok");
});

test("GET /api/leads sem token → 401", async () => {
  const res = await request(app).get("/api/leads");
  assert.strictEqual(res.status, 401);
});

if (process.env.CI === "true") {
  test("GET /ready com banco", async () => {
    const res = await request(app).get("/ready");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "ready");
  });
}
