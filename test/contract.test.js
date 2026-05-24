const { test } = require("node:test");
const assert = require("node:assert");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}

const jwt = require("jsonwebtoken");
const request = require("supertest");
const pool = require("../src/config/db");
const app = require("../src/app");

function signUser(user) {
  return jwt.sign(
    {
      user_id: user.id,
      dealership_id: user.dealership_id,
      role: user.role
    },
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

test("contract: dashboard intelligence requires auth and scoped roles", async () => {
  const originalQuery = pool.query;
  let dbUser = {
    id: 1,
    email: "admin@example.com",
    dealership_id: 1,
    role: "admin"
  };

  pool.query = async (sql, params) => {
    if (String(sql).includes("FROM subscriptions")) {
      assert.deepStrictEqual(params, [dbUser.dealership_id]);
      return { rows: [activeSubscription()] };
    }
    assert.match(String(sql), /FROM users/);
    assert.deepStrictEqual(params, [dbUser.id]);
    return { rows: [dbUser] };
  };

  try {
    const missingToken = await request(app).get(
      "/api/dashboard-intelligence/executive/1"
    );
    assert.strictEqual(missingToken.status, 401);

    dbUser = { ...dbUser, role: "seller" };
    const sellerToken = signUser(dbUser);
    const forbiddenRole = await request(app)
      .get("/api/dashboard-intelligence/executive/1")
      .set("Authorization", `Bearer ${sellerToken}`);
    assert.strictEqual(forbiddenRole.status, 403);

    dbUser = { ...dbUser, role: "admin", dealership_id: 2 };
    const tenantToken = signUser(dbUser);
    const forbiddenTenant = await request(app)
      .get("/api/dashboard-intelligence/executive/1")
      .set("Authorization", `Bearer ${tenantToken}`);
    assert.strictEqual(forbiddenTenant.status, 403);
  } finally {
    pool.query = originalQuery;
  }
});

test("contract: readiness exposes dependency checks", async () => {
  const originalQuery = pool.query;
  const originalRedisUrl = process.env.REDIS_URL;
  delete process.env.REDIS_URL;

  pool.query = async (sql) => {
    assert.strictEqual(String(sql), "SELECT 1");
    return { rows: [{ "?column?": 1 }] };
  };

  try {
    const res = await request(app).get("/ready");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "ready");
    assert.strictEqual(res.body.checks.database.ok, true);
    assert.strictEqual(res.body.checks.redis.skipped, true);
    assert.strictEqual(res.body.checks.redis.required, false);
  } finally {
    pool.query = originalQuery;
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  }
});

test("contract: follow-up scheduling replaces pending rows with one bulk insert", async () => {
  const originalConnect = pool.connect;
  const queries = [];

  pool.connect = async () => ({
    query: async (sql, params = []) => {
      queries.push({ sql: String(sql), params });
      return { rows: [] };
    },
    release: () => {}
  });

  try {
    const followups = require("../src/modules/followups/followup.service");
    await followups.scheduleLeadFollowups(
      { id: 10, dealership_id: 2, name: "Ana" },
      "import"
    );

    const commands = queries.map((query) => query.sql.trim());
    assert.strictEqual(commands[0], "BEGIN");
    assert.match(commands[1], /DELETE FROM lead_followups/);
    assert.match(commands[2], /INSERT INTO lead_followups/);
    assert.strictEqual(commands[3], "COMMIT");
    assert.strictEqual(followups.getFollowupMode("import"), "late");
    assert.strictEqual(queries[2].params.length % 4, 0);
    assert.ok(queries[2].params.length >= 4);
  } finally {
    pool.connect = originalConnect;
  }
});

test("contract: lead CSV import uses bulk insert and unnest state creation", async () => {
  const originalConnect = pool.connect;
  const queries = [];

  pool.connect = async () => ({
    query: async (sql, params = []) => {
      queries.push({ sql: String(sql), params });

      if (String(sql).includes("RETURNING *")) {
        return {
          rows: [
            { id: 101, client_name: "Ana", client_phone: "11911111111" },
            { id: 102, client_name: "Bia", client_phone: "11922222222" }
          ]
        };
      }

      return { rows: [] };
    },
    release: () => {}
  });

  try {
    const service = require("../src/modules/leads_import/leadsImport.service");
    const csv = Buffer.from("name,phone\nAna,11911111111\nBia,11922222222\n");
    const result = await service.importLeads(csv, { dealership_id: 7 });

    const insertLead = queries.find((query) =>
      query.sql.includes("INSERT INTO leads")
    );
    const insertState = queries.find((query) =>
      query.sql.includes("INSERT INTO lead_ai_state")
    );

    assert.strictEqual(result.total, 2);
    assert.ok(insertLead);
    assert.ok(insertState);
    assert.match(insertLead.sql, /VALUES \(\$1, \$2, \$3/);
    assert.match(insertState.sql, /unnest\(\$2::int\[\]\)/);
  } finally {
    pool.connect = originalConnect;
  }
});

test("contract: public vehicle lookup stays slug scoped", async () => {
  const originalQuery = pool.query;

  pool.query = async (sql, params) => {
    assert.match(String(sql), /JOIN dealerships d/);
    assert.match(String(sql), /d\.slug = \$1/);
    assert.match(String(sql), /v\.slug = \$2/);
    assert.deepStrictEqual(params, ["loja-centro", "honda-civic-2020"]);
    return { rows: [{ id: 9, slug: "honda-civic-2020" }] };
  };

  try {
    const service = require("../src/modules/public/public.service");
    const vehicle = await service.getVehicleBySlug(
      "loja-centro",
      "honda-civic-2020"
    );
    assert.strictEqual(vehicle.id, 9);
  } finally {
    pool.query = originalQuery;
  }
});

test("contract: sales approval moves only through allowed states", async () => {
  const repository = require("../src/modules/sales/sales.repository");
  const service = require("../src/modules/sales/sales.service");
  const originalGetSaleById = repository.getSaleById;
  const originalUpdateApprovalStatus = repository.updateApprovalStatus;
  const calls = [];
  let currentSale = { id: 22, approval_status: "draft" };

  repository.getSaleById = async () => currentSale;
  repository.updateApprovalStatus = async (
    saleId,
    dealershipId,
    status,
    userId,
    notes
  ) => {
    calls.push({ saleId, dealershipId, status, userId, notes });
    currentSale = { ...currentSale, approval_status: status };
    return currentSale;
  };

  try {
    const user = { id: 3, dealership_id: 5 };

    await service.submitForApproval(22, user);
    assert.strictEqual(calls.at(-1).status, "pending");

    await service.approveSale(22, user);
    assert.strictEqual(calls.at(-1).status, "approved");

    currentSale = { id: 22, approval_status: "draft" };
    await assert.rejects(
      () => service.approveSale(22, user),
      /pendente/
    );
  } finally {
    repository.getSaleById = originalGetSaleById;
    repository.updateApprovalStatus = originalUpdateApprovalStatus;
  }
});

test("contract: WhatsApp validates input and sends normalized JID", async () => {
  const managerPath = require.resolve("../src/modules/whatsapp_baileys/session.manager");
  const servicePath = require.resolve("../src/modules/whatsapp/whatsapp.service");
  const manager = require(managerPath);
  const originalGetSession = manager.getSession;
  let sent = null;

  manager.getSession = () => ({
    sendMessage: async (jid, payload) => {
      sent = { jid, payload };
    }
  });
  delete require.cache[servicePath];

  try {
    const service = require(servicePath);
    assert.strictEqual(service.canProcess(1, "11999999999"), true);
    assert.strictEqual(service.canProcess(0, "11999999999"), false);
    assert.strictEqual(service.canProcess(1, "123"), false);

    await service.sendMessage(1, "(11) 99999-0000", "ola");
    assert.deepStrictEqual(sent, {
      jid: "11999990000@s.whatsapp.net",
      payload: { text: "ola" }
    });
  } finally {
    manager.getSession = originalGetSession;
    delete require.cache[servicePath];
  }
});
