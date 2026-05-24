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
process.env.INTELLIGENCE_EXPLAIN_WITH_OPENAI = "false";

const pool = require(path.join("..", "src", "config", "db"));
const app = require(path.join("..", "src", "app"));

const originalQuery = pool.query.bind(pool);

function tokenFor(dealership) {
  return jwt.sign(
    { user_id: 77, dealership_id: dealership },
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

describe("intelligence daily actions", () => {
  afterEach(() => {
    pool.query = originalQuery;
  });

  test("GET /api/intelligence/today gera acoes auditaveis e persiste pendentes", async () => {
    const upserts = [];
    let listed = [];

    pool.query = async (sql, params) => {
      const s = String(sql);

      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return {
          rows: [
            {
              id: 77,
              email: "admin@test.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("FROM leads l") && s.includes("MAX(c.created_at)")) {
        assert.deepStrictEqual(params, [7]);
        return {
          rows: [
            {
              id: 10,
              name: "Ana",
              status: "new",
              score: 80,
              priority_score: 88,
              assigned_user_id: null,
              stage: "responded",
              last_interaction_at: new Date(Date.now() - 4 * 60 * 60 * 1000)
            }
          ]
        };
      }
      if (s.includes("FROM vehicles") && s.includes("days_in_stock")) {
        return {
          rows: [
            {
              id: 20,
              title: "Civic 2020",
              price: 90000,
              fipe_price: 80000,
              days_in_stock: 75
            }
          ]
        };
      }
      if (s.includes("FROM users u") && s.includes("stale_leads")) {
        return {
          rows: [
            {
              id: 30,
              name: "Vendedor",
              assigned_leads: 12,
              stale_leads: 6
            }
          ]
        };
      }
      if (s.includes("FROM tasks") && s.includes("due_at < NOW()")) {
        return {
          rows: [
            {
              id: 40,
              title: "Retornar proposta",
              type: "lead",
              due_at: new Date(Date.now() - 86400000)
            }
          ]
        };
      }
      if (s.includes("INSERT INTO intelligence_actions")) {
        const row = {
          id: upserts.length + 1,
          dealership_id: params[0],
          action_key: params[1],
          type: params[2],
          entity_type: params[3],
          entity_id: params[4],
          priority_score: params[5],
          priority_label: params[6],
          reason: params[7],
          suggested_action: params[8],
          evidence: JSON.parse(params[9]),
          explanation: params[10],
          status: "pending"
        };
        upserts.push(row);
        listed = upserts;
        return { rows: [row] };
      }
      if (s.includes("FROM intelligence_actions") && s.includes("status = 'pending'")) {
        return { rows: listed };
      }

      return { rows: [] };
    };

    const res = await request(app)
      .get("/api/intelligence/today")
      .set("Authorization", `Bearer ${tokenFor(7)}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.summary.total_actions >= 4);
    assert.ok(res.body.actions.some((a) => a.type === "lead_followup"));
    assert.ok(res.body.actions.some((a) => a.type === "price_adjustment"));
    assert.ok(res.body.actions.every((a) => a.explanation));
    assert.strictEqual(upserts[0].dealership_id, 7);
  });

  test("GET /api/dashboard/intelligence-actions entrega modelo pronto para tela", async () => {
    pool.query = async (sql) => {
      const s = String(sql);

      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return {
          rows: [
            {
              id: 77,
              email: "admin@test.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("FROM leads l") && s.includes("MAX(c.created_at)")) {
        return { rows: [] };
      }
      if (s.includes("FROM vehicles") && s.includes("days_in_stock")) {
        return { rows: [] };
      }
      if (s.includes("FROM users u") && s.includes("stale_leads")) {
        return { rows: [] };
      }
      if (s.includes("FROM tasks") && s.includes("due_at < NOW()")) {
        return { rows: [] };
      }
      if (s.includes("FROM intelligence_actions") && s.includes("status = 'pending'")) {
        return { rows: [] };
      }

      return { rows: [] };
    };

    const res = await request(app)
      .get("/api/dashboard/intelligence-actions")
      .set("Authorization", `Bearer ${tokenFor(7)}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.screen.title, "Acoes inteligentes de hoje");
    assert.strictEqual(
      res.body.screen.feedback.endpoint_template,
      "/api/intelligence/actions/:id/feedback"
    );
    assert.ok(Array.isArray(res.body.summary_cards));
    assert.deepStrictEqual(res.body.actions, []);
  });

  test("PATCH /api/intelligence/actions/:id/feedback registra accepted", async () => {
    let updateParams;
    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return {
          rows: [
            {
              id: 77,
              email: "admin@test.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("UPDATE intelligence_actions")) {
        updateParams = params;
        return {
          rows: [
            {
              id: 9,
              dealership_id: 7,
              status: "accepted",
              decided_by: 77
            }
          ]
        };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .patch("/api/intelligence/actions/9/feedback")
      .set("Authorization", `Bearer ${tokenFor(7)}`)
      .send({ status: "accepted" });

    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(updateParams, ["accepted", 77, "9", 7]);
    assert.strictEqual(res.body.status, "accepted");
  });

  test("POST /api/intelligence/actions/:id/outcome registra resultado de acao aceita", async () => {
    let outcomeParams;

    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return {
          rows: [
            {
              id: 77,
              email: "admin@test.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("FROM intelligence_actions") && s.includes("WHERE id = $1")) {
        assert.deepStrictEqual(params, ["9", 7]);
        return {
          rows: [
            {
              id: 9,
              dealership_id: 7,
              type: "lead_followup",
              entity_type: "lead",
              entity_id: 10,
              priority_score: 88,
              status: "accepted"
            }
          ]
        };
      }
      if (s.includes("INSERT INTO intelligence_action_outcomes")) {
        outcomeParams = params;
        return {
          rows: [
            {
              id: 3,
              action_id: 9,
              dealership_id: 7,
              recorded_by: 77,
              outcome_type: "proposal",
              outcome_value: "85000.00"
            }
          ]
        };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/intelligence/actions/9/outcome")
      .set("Authorization", `Bearer ${tokenFor(7)}`)
      .send({
        outcome_type: "proposal",
        outcome_value: 85000,
        notes: "Cliente pediu simulacao",
        metadata: { source: "dashboard" }
      });

    assert.strictEqual(res.status, 201);
    assert.deepStrictEqual(outcomeParams.slice(0, 6), [
      "9",
      7,
      77,
      "proposal",
      85000,
      "Cliente pediu simulacao"
    ]);
    const metadata = JSON.parse(outcomeParams[7]);
    assert.strictEqual(metadata.entity_type, "lead");
    assert.strictEqual(metadata.entity_id, 10);
    assert.strictEqual(metadata.source, "dashboard");
    assert.strictEqual(res.body.outcome_type, "proposal");
  });

  test("POST /api/intelligence/actions/:id/outcome bloqueia acao nao aceita", async () => {
    pool.query = async (sql) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return {
          rows: [
            {
              id: 77,
              email: "admin@test.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("FROM intelligence_actions") && s.includes("WHERE id = $1")) {
        return {
          rows: [
            {
              id: 9,
              dealership_id: 7,
              type: "lead_followup",
              status: "pending"
            }
          ]
        };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/intelligence/actions/9/outcome")
      .set("Authorization", `Bearer ${tokenFor(7)}`)
      .send({ outcome_type: "reply" });

    assert.strictEqual(res.status, 409);
    assert.match(res.body.error, /aceitas/);
  });

  test("GET /api/intelligence/learning-metrics agrega aprendizado por loja", async () => {
    const seenQueries = [];

    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return {
          rows: [
            {
              id: 77,
              email: "admin@test.com",
              dealership_id: 7,
              role: "admin"
            }
          ]
        };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("GROUP BY o.outcome_type")) {
        seenQueries.push("outcome_type");
        return {
          rows: [
            { outcome_type: "sale", total: 1, outcome_value_total: "90000" },
            { outcome_type: "proposal", total: 2, outcome_value_total: "80000" }
          ]
        };
      }
      if (s.includes("GROUP BY a.type")) {
        seenQueries.push("action_type");
        return {
          rows: [
            {
              type: "lead_followup",
              total_actions: 6,
              accepted_actions: 4,
              ignored_actions: 1,
              outcomes_recorded: 3,
              positive_outcomes: 3,
              sales_generated: 1,
              proposals_generated: 2,
              outcome_value_total: "170000",
              average_priority_score: "82.5"
            }
          ]
        };
      }
      if (s.includes("COUNT(*)::int AS total_actions")) {
        seenQueries.push("summary");
        assert.deepStrictEqual(params, [7, 30]);
        return {
          rows: [
            {
              total_actions: 10,
              pending_actions: 2,
              accepted_actions: 5,
              ignored_actions: 3,
              outcomes_recorded: 4,
              positive_outcomes: 3,
              sales_generated: 1,
              outcome_value_total: "170000"
            }
          ]
        };
      }
      if (s.includes("GROUP BY u.id, u.name, u.email")) {
        seenQueries.push("seller");
        return {
          rows: [
            {
              user_id: 77,
              user_name: "Vendedor",
              outcomes_recorded: 4,
              positive_outcomes: 3,
              sales_generated: 1,
              proposals_generated: 2,
              appointments_generated: 0,
              outcome_value_total: "170000"
            }
          ]
        };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .get("/api/intelligence/learning-metrics?days=30")
      .set("Authorization", `Bearer ${tokenFor(7)}`);

    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(seenQueries, [
      "summary",
      "outcome_type",
      "action_type",
      "seller"
    ]);
    assert.strictEqual(res.body.period_days, 30);
    assert.strictEqual(res.body.summary.acceptance_rate, 50);
    assert.strictEqual(res.body.summary.outcome_rate, 80);
    assert.strictEqual(res.body.summary.positive_outcome_rate, 60);
    assert.strictEqual(res.body.summary.value_per_accepted_action, 34000);
    assert.strictEqual(res.body.by_action_type[0].positive_outcome_rate, 75);
    assert.strictEqual(res.body.by_seller[0].positive_outcome_rate, 75);
  });
});
