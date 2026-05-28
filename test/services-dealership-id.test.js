/**
 * Serviços críticos: usam user.dealership_id e user.id (nunca dealershipId / userId no user).
 */
const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert");
const path = require("path");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}

const user = (dealership = 11, id = 22) => ({
  id,
  email: "u@x.com",
  dealership_id: dealership,
  role: "admin"
});

const pool = require(path.join("..", "src", "config", "db"));
const originalQuery = pool.query.bind(pool);
const originalConnect = pool.connect.bind(pool);

function restorePool() {
  pool.query = originalQuery;
  pool.connect = originalConnect;
}

describe("services: user.dealership_id e user.id", () => {
  afterEach(() => {
    restorePool();
  });

  test("clients.listClients passa dealership_id ao repositório", async () => {
    const repo = require(path.join("..", "src", "modules", "clients", "clients.repository"));
    const service = require(path.join("..", "src", "modules", "clients", "clients.service"));
    const o = repo.findAll;
    let d;
    repo.findAll = async (did) => {
      d = did;
      return [];
    };
    try {
      await service.listClients(user(33));
      assert.strictEqual(d, 33);
    } finally {
      repo.findAll = o;
    }
  });

  test("finance.listTransactions passa dealership_id", async () => {
    const repo = require(path.join("..", "src", "modules", "finance", "finance.repository"));
    const service = require(path.join("..", "src", "modules", "finance", "finance.service"));
    const o = repo.findAll;
    let d;
    repo.findAll = async (did) => {
      d = did;
      return [];
    };
    try {
      await service.listTransactions(user(44));
      assert.strictEqual(d, 44);
    } finally {
      repo.findAll = o;
    }
  });

  test("ads.listAds passa user.dealership_id ao repositório", async () => {
    const repo = require(path.join("..", "src", "modules", "ads", "ads.repository"));
    const service = require(path.join("..", "src", "modules", "ads", "ads.service"));
    const o = repo.findByVehicle;
    let v;
    let d;
    repo.findByVehicle = async (veh, did) => {
      v = veh;
      d = did;
      return [];
    };
    try {
      await service.listAds(9, user(55));
      assert.strictEqual(v, 9);
      assert.strictEqual(d, 55);
    } finally {
      repo.findByVehicle = o;
    }
  });

  test("proposals.createProposal usa dealership_id e id em created_by", async () => {
    const repo = require(path.join("..", "src", "modules", "proposals", "proposals.repository"));
    const service = require(path.join("..", "src", "modules", "proposals", "proposals.service"));
    const o = repo.create;
    let payload;
    repo.create = async (data) => {
      payload = data;
      return { id: 1 };
    };
    try {
      await service.createProposal(
        { client_id: 1, vehicle_id: 2, price: 1, status: "open" },
        user(66, 77)
      );
      assert.strictEqual(payload.dealership_id, 66);
      assert.strictEqual(payload.created_by, 77);
    } finally {
      repo.create = o;
    }
  });

  test("dashboard.getAlerts consulta com dealership_id do user", async () => {
    const service = require(path.join("..", "src", "modules", "dashboard", "dashboard.service"));
    const calls = [];
    pool.query = async (sql, params) => {
      calls.push({ sql, params });
      if (String(sql).includes("subscriptions")) return { rows: [] };
      if (String(sql).includes("leads") && String(sql).includes("COUNT")) {
        return { rows: [{ count: "0" }] };
      }
      if (String(sql).includes("proposals") && String(sql).includes("COUNT")) {
        return { rows: [{ count: "0" }] };
      }
      if (String(sql).includes("financial_transactions") || String(sql).includes("finance_entries")) {
        return { rows: [{ count: "0" }] };
      }
      return { rows: [] };
    };
    try {
      await service.getAlerts(user(88, 1));
      assert.ok(calls.length >= 4, "espera várias queries de dashboard");
      for (const c of calls) {
        assert.strictEqual(
          c.params[0],
          88,
          "todas as queries de tenant devem usar user.dealership_id"
        );
      }
    } finally {
      pool.query = originalQuery;
    }
  });

  test("maintenance.createMaintenance: INSERT com dealership do user", async () => {
    const service = require(path.join("..", "src", "modules", "maintenance", "maintenance.service"));
    let insParams;
    const oq = pool.query;
    const client = {
      query: async (sql, params) => {
        const s = String(sql);
        if (s.includes("INSERT INTO maintenance_orders") && s.includes("VALUES")) {
          insParams = params;
          return { rows: [{ id: 3, dealership_id: insParams[0], vehicle_id: insParams[1] }] };
        }
        if (s === "BEGIN" || s === "COMMIT" || s === "ROLLBACK") return { rows: [] };
        if (s.includes("INSERT INTO maintenance_tasks")) return { rows: [] };
        return { rows: [] };
      },
      release: () => {}
    };
    pool.query = async (sql, params) => {
      if (String(sql).includes("SELECT id, dealership_id FROM vehicles WHERE id = $1")) {
        assert.strictEqual(params[0], 4);
        return { rows: [{ id: 4, dealership_id: 9 }] };
      }
      return oq(sql, params);
    };
    pool.connect = async () => client;
    try {
      await service.createMaintenance({ vehicle_id: 4, tasks: [] }, user(9));
      assert.strictEqual(insParams[0], 9, "insert ordem: dealership_id");
    } finally {
      pool.query = oq;
      pool.connect = originalConnect;
    }
  });

  test("maintenance.updateDocumentation: UPDATE com dealership", async () => {
    const service = require(path.join("..", "src", "modules", "maintenance", "maintenance.service"));
    let updParams;
    pool.query = async (sql, params) => {
      if (
        String(sql).includes("UPDATE vehicles") &&
        String(sql).includes("documentation_status")
      ) {
        updParams = params;
        return { rows: [{ id: 1 }] };
      }
      return originalQuery(sql, params);
    };
    try {
      await service.updateDocumentation(10, "ok", user(9));
      assert.ok(updParams);
      assert.strictEqual(updParams[2], 9);
    } finally {
      pool.query = originalQuery;
    }
  });

  test("integrations.publishToCarrosNaCidade filtra veículo por user.dealership_id", async () => {
    const service = require(path.join("..", "src", "modules", "integrations", "integrations.service"));
    const cnc = require(path.join(
      "..",
      "src",
      "modules",
      "integrations",
      "adapters",
      "carrosNaCidade.adapter"
    ));
    const repo = require(path.join("..", "src", "modules", "integrations", "integrations.repository"));
    const adPreparation = require(path.join("..", "src", "modules", "ad_preparation", "adPreparation.service"));
    const oPub = cnc.publishVehicle;
    const oCreate = repo.create;
    const oAssertCanPublish = adPreparation.assertCanPublish;
    const oQ = pool.query;
    let vehicleParams;
    let readinessParams;
    cnc.publishVehicle = async () => ({ id: "ext-1" });
    adPreparation.assertCanPublish = async (vehicleId, currentUser) => {
      readinessParams = [vehicleId, currentUser.dealership_id];
      return { canPublish: true };
    };
    let created;
    repo.create = async (row) => {
      created = row;
      return { id: 1, ...row };
    };
    pool.query = async (sql, params) => {
      if (String(sql).includes("FROM vehicles") && String(sql).includes("dealership_id = $2")) {
        vehicleParams = params;
        return { rows: [{ id: 1, brand: "A", model: "B", year: 2020, price: 1000 }] };
      }
      if (String(sql).includes("vehicle_images")) {
        return { rows: [] };
      }
      return oQ(sql, params);
    };
    try {
      await service.publishToCarrosNaCidade(1, user(101));
      assert.deepStrictEqual(readinessParams, [1, 101]);
      assert.deepStrictEqual(vehicleParams, [1, 101]);
      assert.strictEqual(created.dealership_id, 101);
    } finally {
      cnc.publishVehicle = oPub;
      repo.create = oCreate;
      adPreparation.assertCanPublish = oAssertCanPublish;
      pool.query = oQ;
    }
  });
});
