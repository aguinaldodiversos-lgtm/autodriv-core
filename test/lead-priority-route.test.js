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

const originalQuery = pool.query.bind(pool);

function tokenFor(dealership) {
  return jwt.sign(
    { user_id: 10, dealership_id: dealership },
    process.env.JWT_SECRET
  );
}

describe("lead-priority route", () => {
  afterEach(() => {
    pool.query = originalQuery;
  });

  test("GET /api/lead-priority lista leads priorizados da loja", async () => {
    let priorityParams;
    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return {
          rows: [
            {
              id: 10,
              email: "admin@test.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }
      if (s.includes("FROM subscriptions")) {
        return {
          rows: [
            {
              id: 1,
              plan: "master",
              status: "active",
              current_period_end: new Date(Date.now() + 86400000)
            }
          ]
        };
      }
      if (s.includes("FROM leads") && s.includes("priority_score")) {
        priorityParams = params;
        return {
          rows: [{ id: 55, dealership_id: 7, priority_score: 91 }]
        };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .get("/api/lead-priority")
      .set("Authorization", `Bearer ${tokenFor(7)}`);

    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(priorityParams, [7]);
    assert.deepStrictEqual(res.body, [
      { id: 55, dealership_id: 7, priority_score: 91 }
    ]);
  });
});
