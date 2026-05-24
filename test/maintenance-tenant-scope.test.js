/**
 * Isolamento multitenancy: manutenção (ordens, tarefas).
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
const service = require(path.join("..", "src", "modules", "maintenance", "maintenance.service"));
const originalQuery = pool.query.bind(pool);
const originalConnect = pool.connect.bind(pool);

function token(did) {
  return jwt.sign(
    { user_id: 20, dealership_id: did },
    process.env.JWT_SECRET
  );
}

function u(did) {
  return { id: 20, email: "m@t.com", dealership_id: did, role: "admin" };
}

function activeSubscription() {
  return {
    id: 1,
    plan: "master",
    status: "active",
    current_period_end: new Date(Date.now() + 86400000)
  };
}

describe("maintenance: updateTask (serviço)", () => {
  afterEach(() => {
    pool.query = originalQuery;
  });

  test("Loja 1: atualiza tarefa da própria loja (UPDATE devolveu linha)", async () => {
    const repo = require(path.join("..", "src", "modules", "maintenance", "maintenance.repository"));
    const o = repo.updateTaskStatusForDealership;
    repo.updateTaskStatusForDealership = async (tid, st, d) => {
      assert.strictEqual(tid, 5);
      assert.strictEqual(d, 1);
      return { id: 5, order_id: 1, status: st };
    };
    try {
      const row = await service.updateTask("5", "done", u(1));
      assert.strictEqual(row.status, "done");
    } finally {
      repo.updateTaskStatusForDealership = o;
    }
  });

  test("Loja 1, tarefa de Loja 2: 403 (UPDATE vazio, probe encontra outro dealer)", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("UPDATE maintenance_tasks t")) {
        return { rows: [] };
      }
      if (String(sql).includes("FROM maintenance_tasks t") && String(sql).includes("INNER JOIN maintenance_orders")) {
        return { rows: [{ dealership_id: 2 }] };
      }
      return { rows: [] };
    };
    await assert.rejects(
      () => service.updateTask(99, "x", u(1)),
      (e) => e.statusCode === 403
    );
  });

  test("tarefa inexistente: 404", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("UPDATE maintenance_tasks t")) {
        return { rows: [] };
      }
      if (String(sql).includes("INNER JOIN maintenance_orders")) {
        return { rows: [] };
      }
      return { rows: [] };
    };
    await assert.rejects(
      () => service.updateTask(9999, "x", u(1)),
      (e) => e.statusCode === 404
    );
  });

  test("criar ordem com veículo de outra loja: 403 (antes de transação)", async () => {
    pool.query = async (sql, params) => {
      if (String(sql).includes("SELECT id, dealership_id FROM vehicles WHERE id = $1")) {
        return { rows: [{ id: 1, dealership_id: 2 }] };
      }
      return originalQuery(sql, params);
    };
    await assert.rejects(
      () => service.createMaintenance({ vehicle_id: 1, tasks: [] }, u(1)),
      (e) => e.statusCode === 403
    );
  });

  test("getMaintenanceByVehicle: sem loja no user → 403", async () => {
    await assert.rejects(
      () => service.getMaintenanceByVehicle(1, { id: 1, dealership_id: null }),
      (e) => e.statusCode === 403
    );
  });

  test("getMaintenanceByVehicle: Loja 1 não vê ordem associada só à Loja 2 (null)", async () => {
    const repo = require(path.join("..", "src", "modules", "maintenance", "maintenance.repository"));
    const o = repo.findOrderByVehicle;
    repo.findOrderByVehicle = async (vid, did) => {
      assert.strictEqual(did, 1);
      return undefined;
    };
    try {
      const data = await service.getMaintenanceByVehicle(88, u(1));
      assert.strictEqual(data, null);
    } finally {
      repo.findOrderByVehicle = o;
    }
  });
});

describe("maintenance: HTTP (mock pool)", () => {
  afterEach(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  test("PUT /api/maintenance/task/:id — 200 mesma loja", async () => {
    let updated = 0;
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users") && String(sql).includes("WHERE id")) {
        return { rows: [u(1)] };
      }
      if (String(sql).includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (String(sql).includes("UPDATE maintenance_tasks t") && String(sql).includes("FROM maintenance_orders o")) {
        updated += 1;
        return { rows: [{ id: 5, status: "ok" }] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .put("/api/maintenance/task/5")
      .set("Authorization", `Bearer ${token(1)}`)
      .send({ status: "done" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(updated, 1);
  });

  test("PUT tarefa outra loja: 403", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users") && String(sql).includes("WHERE id")) {
        return { rows: [u(1)] };
      }
      if (String(sql).includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (String(sql).includes("UPDATE maintenance_tasks t")) {
        return { rows: [] };
      }
      if (String(sql).includes("INNER JOIN maintenance_orders") && String(sql).includes("WHERE t.id = $1")) {
        return { rows: [{ dealership_id: 9 }] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .put("/api/maintenance/task/1")
      .set("Authorization", `Bearer ${token(1)}`)
      .send({ status: "x" });
    assert.strictEqual(res.status, 403);
  });

  test("GET /vehicle/:id — Loja 1 não recebe ordem de outra loja (sem linha)", async () => {
    pool.query = async (sql, params) => {
      if (String(sql).includes("FROM users") && String(sql).includes("WHERE id")) {
        return { rows: [u(1)] };
      }
      if (String(sql).includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (
        String(sql).includes("FROM maintenance_orders") &&
        String(sql).includes("vehicle_id = $1") &&
        String(sql).includes("dealership_id = $2")
      ) {
        assert.strictEqual(params[1], 1);
        return { rows: [] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .get("/api/maintenance/vehicle/42")
      .set("Authorization", `Bearer ${token(1)}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body, null);
  });
});
