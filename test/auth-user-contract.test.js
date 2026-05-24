/**
 * Contrato: após autenticação, req.user expõe id e dealership_id;
 * token sem loja (dealership_id nulo) → 403 controlado.
 */
const { test, describe, beforeEach, afterEach } = require("node:test");
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

function activeSubscription() {
  return {
    id: 1,
    plan: "master",
    status: "active",
    current_period_end: new Date(Date.now() + 86400000)
  };
}

describe("auth user contract (HTTP + tenant)", () => {
  afterEach(() => {
    pool.query = originalQuery;
  });

  test("autenticado: GET /api/clients e req.user lógico (pool vê dealership_id=7)", async () => {
    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id")) {
        assert.strictEqual(params[0], 99);
        return {
          rows: [
            {
              id: 99,
              email: "t@t.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }
      if (s.includes("FROM subscriptions")) {
        assert.strictEqual(params[0], 7);
        return { rows: [activeSubscription()] };
      }
      if (s.includes("FROM clients") && s.includes("dealership_id = $1")) {
        assert.strictEqual(params[0], 7, "repositório deve receber user.dealership_id");
        return { rows: [] };
      }
      return originalQuery(sql, params);
    };

    const token = jwt.sign(
      { user_id: 99, dealership_id: 7 },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  test("dealership_id nulo no utilizador: 403 explícita", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users") && String(sql).includes("WHERE id")) {
        return {
          rows: [
            {
              id: 1,
              email: "nolo@t.com",
              dealership_id: null,
              role: "admin"
            }
          ]
        };
      }
      return { rows: [] };
    };

    const token = jwt.sign({ user_id: 1 }, process.env.JWT_SECRET);

    const res = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${token}`);

    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /loja/);
  });

  test("trial expirado bloqueia rota paga antes do controller", async () => {
    let clientCalls = 0;
    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return {
          rows: [
            {
              id: 99,
              email: "trial@t.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }
      if (s.includes("FROM subscriptions")) {
        assert.strictEqual(params[0], 7);
        return {
          rows: [
            {
              id: 1,
              plan: "trial",
              status: "active",
              current_period_end: new Date(Date.now() - 86400000)
            }
          ]
        };
      }
      if (s.includes("FROM clients")) {
        clientCalls += 1;
      }
      return { rows: [] };
    };

    const token = jwt.sign(
      { user_id: 99, dealership_id: 7 },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${token}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, "trial_expired");
    assert.strictEqual(clientCalls, 0);
  });

  test("GET /api/auth/me retorna usuario, loja, assinatura e permissoes", async () => {
    pool.query = async (sql, params) => {
      const s = String(sql);

      if (s.includes("FROM users") && s.includes("SELECT id, email, dealership_id, role")) {
        assert.strictEqual(params[0], 99);
        return {
          rows: [
            {
              id: 99,
              email: "admin@test.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }

      if (s.includes("FROM users") && s.includes("name, email, role")) {
        assert.strictEqual(params[0], 99);
        return {
          rows: [
            {
              id: 99,
              dealership_id: 7,
              name: "Admin",
              email: "admin@test.com",
              role: "admin",
              created_at: new Date("2026-01-01T00:00:00Z")
            }
          ]
        };
      }

      if (s.includes("FROM dealerships")) {
        assert.strictEqual(params[0], 7);
        return {
          rows: [
            {
              id: 7,
              name: "Loja Teste",
              email: "loja@test.com",
              phone: "11999999999"
            }
          ]
        };
      }

      if (s.includes("FROM subscriptions")) {
        assert.strictEqual(params[0], 7);
        return { rows: [activeSubscription()] };
      }

      return { rows: [] };
    };

    const token = jwt.sign(
      { user_id: 99, dealership_id: 7 },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.email, "admin@test.com");
    assert.strictEqual(res.body.dealership.name, "Loja Teste");
    assert.strictEqual(res.body.subscription.status, "active");
    assert.ok(res.body.permissions.includes("users:manage"));
  });

  test("GET /api/contracts lista contratos da loja autenticada", async () => {
    pool.query = async (sql, params) => {
      const s = String(sql);

      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return {
          rows: [
            {
              id: 99,
              email: "admin@test.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }

      if (s.includes("FROM subscriptions")) {
        assert.strictEqual(params[0], 7);
        return { rows: [activeSubscription()] };
      }

      if (s.includes("FROM contracts c") && s.includes("LEFT JOIN sales s")) {
        assert.strictEqual(params[0], 7);
        assert.strictEqual(params[1], 50);
        return {
          rows: [
            {
              id: 10,
              sale_id: 20,
              dealership_id: 7,
              version: 1,
              status: "pending_approval",
              price: "85000.00",
              client_name: "Cliente Teste",
              vehicle_title: "Civic 2020",
              responsible_name: "Vendedor"
            }
          ]
        };
      }

      return { rows: [] };
    };

    const token = jwt.sign(
      { user_id: 99, dealership_id: 7 },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .get("/api/contracts")
      .set("Authorization", `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].client_name, "Cliente Teste");
    assert.strictEqual(res.body[0].dealership_id, 7);
  });
});
