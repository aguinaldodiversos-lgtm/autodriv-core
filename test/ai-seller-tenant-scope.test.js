/**
 * IDOR: vendedor IA deve escopar lead por req.user.dealership_id.
 */
const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const path = require("path");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const pool = require(path.join("..", "src", "config", "db"));
const app = require(path.join("..", "src", "app"));
const service = require(path.join("..", "src", "modules", "ai_seller", "aiSeller.service"));

const originalQuery = pool.query.bind(pool);

function tokenFor(dealership) {
  return jwt.sign(
    { user_id: 99, dealership_id: dealership },
    process.env.JWT_SECRET
  );
}

function userRow(dealership) {
  return {
    id: 99,
    email: "seller@test.com",
    dealership_id: dealership,
    role: "admin"
  };
}

function activeSubscription() {
  return {
    id: 1,
    plan: "master",
    status: "active",
    current_period_end: new Date(Date.now() + 86400000)
  };
}

describe("ai-seller tenant scope", () => {
  afterEach(() => {
    pool.query = originalQuery;
  });

  test("HTTP: lead de outra loja retorna 404 e nao atualiza metricas", async () => {
    let leadSelectParams;
    let updateCalls = 0;

    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id = $1")) {
        return { rows: [userRow(1)] };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("FROM leads") && s.includes("WHERE id = $1") && s.includes("dealership_id = $2")) {
        leadSelectParams = params;
        return { rows: [] };
      }
      if (s.includes("UPDATE leads") && s.includes("last_ai_tokens")) {
        updateCalls += 1;
        return { rows: [] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/ai-seller/message")
      .set("Authorization", `Bearer ${tokenFor(1)}`)
      .send({ lead_id: 20, message: "Tenho interesse no carro" });

    assert.strictEqual(res.status, 404);
    assert.deepStrictEqual(leadSelectParams, [20, 1]);
    assert.strictEqual(updateCalls, 0);
  });

  test("servico em modo strict exige dealershipId", async () => {
    await assert.rejects(
      () => service.handleMessage(1, "oi", [], { strict: true }),
      (err) => err.statusCode === 403
    );
  });
});
