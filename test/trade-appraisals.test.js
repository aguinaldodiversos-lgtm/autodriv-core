const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert");
const path = require("path");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}

const pool = require(path.join("..", "src", "config", "db"));
const service = require(path.join("..", "src", "modules", "trade_appraisals", "tradeAppraisals.service"));
const { calculateOffer } = require(path.join("..", "src", "modules", "trade_appraisals", "tradeAppraisals.pricing"));

const originalQuery = pool.query.bind(pool);
const originalConnect = pool.connect.bind(pool);

const user = { id: 77, dealership_id: 7, role: "admin" };

describe("trade appraisals", () => {
  afterEach(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  test("calcula oferta preservando reparo, documentacao e margem", () => {
    const result = calculateOffer({
      brand: "Honda",
      model: "Civic",
      year: 2020,
      mileage: 62000,
      fipe_price: 90000,
      condition_score: 80,
      estimated_repair_cost: 3000,
      documentation_cost: 1000,
      desired_margin_percent: 12
    });

    assert.strictEqual(result.expected_resale_price, 90000);
    assert.ok(result.suggested_offer_price < 90000);
    assert.ok(result.breakdown.desired_margin_amount > 0);
    assert.ok(result.reasons.some((item) => item.includes("Margem")));
  });

  test("cria avaliacao de troca com seller_action e tenant correto", async () => {
    const inserts = [];
    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("INSERT INTO trade_appraisals")) {
        inserts.push({ table: "trade_appraisals", params });
        return {
          rows: [
            {
              id: 10,
              dealership_id: params[0],
              lead_id: params[1],
              brand: params[9],
              model: params[10],
              suggested_offer_price: params[29],
              status: params[6]
            }
          ]
        };
      }
      if (s.includes("INSERT INTO seller_actions")) {
        inserts.push({ table: "seller_actions", params });
        return { rows: [{ id: 20, dealership_id: params[0], lead_id: params[1] }] };
      }
      return { rows: [] };
    };

    const appraisal = await service.create(user, {
      lead_id: 5,
      brand: "Toyota",
      model: "Corolla",
      year: 2019,
      mileage: 70000,
      fipe_price: 85000,
      condition_score: 75,
      estimated_repair_cost: 2500
    });

    assert.strictEqual(appraisal.dealership_id, 7);
    assert.strictEqual(appraisal.lead_id, 5);
    assert.strictEqual(inserts[0].table, "trade_appraisals");
    assert.strictEqual(inserts[0].params[0], 7);
    assert.strictEqual(inserts[1].table, "seller_actions");
    assert.strictEqual(inserts[1].params[0], 7);
    assert.strictEqual(inserts[1].params[1], 5);
  });

  test("bloqueia conversao para estoque antes do aceite", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM trade_appraisals")) {
        return {
          rows: [
            {
              id: 10,
              dealership_id: 7,
              status: "offered",
              brand: "Ford",
              model: "Ka"
            }
          ]
        };
      }
      return { rows: [] };
    };

    await assert.rejects(
      () => service.convertToStock(user, 10),
      (err) => err.payload?.error === "TRADE_APPRAISAL_NOT_ACCEPTED"
    );
  });
});
