/**
 * IDOR: distribuição de lead deve respeitar req.user.dealership_id.
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

const originalQuery = pool.query.bind(pool);

function userRow(dealership) {
  return {
    id: 99,
    email: "d@test.com",
    dealership_id: dealership,
    role: "admin"
  };
}

function tokenFor(dealership) {
  return jwt.sign(
    { user_id: 99, dealership_id: dealership },
    process.env.JWT_SECRET
  );
}

function activeSubscription() {
  return {
    id: 1,
    plan: "master",
    status: "active",
    current_period_end: new Date(Date.now() + 86400000)
  };
}

describe("lead-distribution IDOR", () => {
  afterEach(() => {
    pool.query = originalQuery;
  });

  test("Loja 1 distribui lead da Loja 1: sucesso (200)", async () => {
    let step = 0;
    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id = $1")) {
        return { rows: [userRow(1)] };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("SELECT id, dealership_id FROM leads") && s.includes("WHERE id = $1")) {
        assert.strictEqual(params[0], 10);
        step += 1;
        return { rows: [{ id: 10, dealership_id: 1 }] };
      }
      if (s.includes("FROM users u") && s.includes("u.role = 'seller'")) {
        assert.strictEqual(params[0], 1);
        step += 1;
        return { rows: [{ id: 50, total_leads: "0" }] };
      }
      if (s.includes("UPDATE leads") && s.includes("assigned_user_id") && s.includes("dealership_id = $3")) {
        assert.deepStrictEqual(params, [10, 50, 1]);
        step += 1;
        return { rows: [{ id: 10 }] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/lead-distribution/distribute")
      .set("Authorization", `Bearer ${tokenFor(1)}`)
      .send({ leadId: 10 });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.assigned_to, 50);
    assert.strictEqual(step, 3, "select lead + vendedores + update");
  });

  test("Loja 1 tenta lead da Loja 2: 403, sem UPDATE", async () => {
    let updateCalls = 0;
    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id = $1")) {
        return { rows: [userRow(1)] };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("SELECT id, dealership_id FROM leads") && s.includes("WHERE id = $1")) {
        return { rows: [{ id: 20, dealership_id: 2 }] };
      }
      if (s.includes("UPDATE leads") && s.includes("assigned_user_id")) {
        updateCalls += 1;
        return { rows: [] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/lead-distribution/distribute")
      .set("Authorization", `Bearer ${tokenFor(1)}`)
      .send({ leadId: 20 });

    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /outra loja|negado/);
    assert.strictEqual(updateCalls, 0);
  });

  test("Loja 2 tenta lead atribuído à Loja 1: 403", async () => {
    pool.query = async (sql) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id = $1")) {
        return { rows: [userRow(2)] };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("SELECT id, dealership_id FROM leads") && s.includes("WHERE id = $1")) {
        return { rows: [{ id: 30, dealership_id: 1 }] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/lead-distribution/distribute")
      .set("Authorization", `Bearer ${tokenFor(2)}`)
      .send({ leadId: 30 });

    assert.strictEqual(res.status, 403);
  });

  test("utilizador sem loja: 403 (auth)", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users") && String(sql).includes("WHERE id = $1")) {
        return {
          rows: [
            {
              id: 1,
              email: "n@n.com",
              dealership_id: null,
              role: "admin"
            }
          ]
        };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/lead-distribution/distribute")
      .set("Authorization", `Bearer ${jwt.sign({ user_id: 1 }, process.env.JWT_SECRET)}`)
      .send({ leadId: 1 });

    assert.strictEqual(res.status, 403);
    assert.match(String(res.body.error), /loja|associad/i);
  });

  test("lead inexistente: 404", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users") && String(sql).includes("WHERE id = $1")) {
        return { rows: [userRow(1)] };
      }
      if (String(sql).includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (String(sql).includes("SELECT id, dealership_id FROM leads") && String(sql).includes("WHERE id = $1")) {
        return { rows: [] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/lead-distribution/distribute")
      .set("Authorization", `Bearer ${tokenFor(1)}`)
      .send({ leadId: 99999 });

    assert.strictEqual(res.status, 404);
    assert.match(res.body.error, /não encontrado/);
  });
});

describe("distributeLead (unidade) — escopo rejeitado sem HTTP", () => {
  const service = require(path.join("..", "src", "modules", "lead_distribution", "distribution.service"));
  const originalQ = pool.query.bind(pool);

  afterEach(() => {
    pool.query = originalQ;
  });

  test("userDealershipId nulo: 403", async () => {
    await assert.rejects(
      () => service.distributeLead(1, null),
      (err) => err.statusCode === 403
    );
  });
});
