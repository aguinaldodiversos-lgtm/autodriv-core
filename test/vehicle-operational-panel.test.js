const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert");
const path = require("path");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}

const pool = require(path.join("..", "src", "config", "db"));
const vehicleService = require(path.join("..", "src", "modules", "vehicles", "vehicles.service"));
const {
  buildPanel,
  buildRecommendation
} = require(path.join("..", "src", "modules", "vehicles", "vehicleOperationalPanel.logic"));

const now = new Date("2026-05-30T12:00:00-03:00");
const originalQuery = pool.query.bind(pool);
const originalConnect = pool.connect.bind(pool);

function row(overrides = {}) {
  return {
    id: 1,
    dealership_id: 7,
    brand: "Honda",
    model: "Civic",
    version: "EXL",
    year: 2020,
    status: "available",
    ad_status: "draft",
    preparation_status: "done",
    documentation_status: "ready",
    legal_restriction_status: "clear",
    price: 90000,
    fipe_price: 94000,
    purchase_price: 79000,
    preparation_cost_estimate: 2500,
    documentation_cost: 700,
    image_count: 8,
    has_main_image: true,
    ad_score: 82,
    can_publish: true,
    blocking_reasons: [],
    warnings: [],
    created_at: "2026-05-01T10:00:00Z",
    entry_date: "2026-05-01T10:00:00Z",
    ...overrides
  };
}

describe("vehicle operational panel", () => {
  afterEach(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  test("view=stock retorna apenas veiculos nao vendidos", () => {
    const panel = buildPanel(
      [
        row({ id: 1 }),
        row({ id: 2, status: "sold", sold_at: "2026-05-20T12:00:00Z" })
      ],
      { view: "stock" },
      now
    );

    assert.strictEqual(panel.data.length, 1);
    assert.strictEqual(panel.data[0].id, 1);
    assert.strictEqual(panel.summary.stockCount, 1);
  });

  test("view=showroom retorna veiculo pronto e com margem positiva", () => {
    const panel = buildPanel(
      [
        row({ id: 1 }),
        row({ id: 2, can_publish: false, ad_score: 35, image_count: 0, has_main_image: false })
      ],
      { view: "showroom" },
      now
    );

    assert.deepStrictEqual(panel.data.map((item) => item.id), [1]);
    assert.strictEqual(panel.data[0].recommendation.type, "prioritize_sale");
  });

  test("view=preparation retorna veiculo com pendencias de anuncio", () => {
    const panel = buildPanel(
      [
        row({ id: 1 }),
        row({ id: 2, can_publish: false, image_count: 0, has_main_image: false, fipe_price: null, price: null })
      ],
      { view: "preparation" },
      now
    );

    assert.strictEqual(panel.data.length, 1);
    assert.strictEqual(panel.data[0].id, 2);
    assert.strictEqual(panel.data[0].recommendation.type, "fix_today");
    assert.ok(panel.data[0].topPendingItems.some((item) => item.key === "minimum_photos_count"));
  });

  test("view=sold-month retorna apenas vendas do mes corrente", () => {
    const panel = buildPanel(
      [
        row({ id: 1, status: "sold", sold_at: "2026-05-10T12:00:00Z", sold_price: 91000 }),
        row({ id: 2, status: "sold", sold_at: "2026-04-10T12:00:00Z", sold_price: 91000 }),
        row({ id: 3, status: "available" })
      ],
      { view: "sold-month" },
      now
    );

    assert.strictEqual(panel.data.length, 1);
    assert.strictEqual(panel.data[0].id, 1);
    assert.strictEqual(panel.data[0].recommendation.type, "sold_result");
    assert.strictEqual(panel.summary.soldMonthCount, 1);
  });

  test("filtros, ordenacao e paginacao funcionam", () => {
    const panel = buildPanel(
      [
        row({ id: 1, brand: "Honda", price: 90000, ad_score: 82 }),
        row({ id: 2, brand: "Toyota", price: 120000, ad_score: 91 }),
        row({ id: 3, brand: "Honda", price: 70000, ad_score: 70 })
      ],
      { view: "stock", brand: "honda", sort: "price_asc", page: 1, limit: 1 },
      now
    );

    assert.strictEqual(panel.pagination.total, 2);
    assert.strictEqual(panel.data[0].id, 3);
  });

  test("view invalida retorna erro 400", () => {
    assert.throws(
      () => buildPanel([row()], { view: "invalid" }, now),
      (err) => err.statusCode === 400 && err.payload.error === "INVALID_VEHICLE_VIEW"
    );
  });

  test("recomendacoes cobrem margem negativa e estoque parado", () => {
    assert.strictEqual(
      buildRecommendation({
        status: "available",
        expectedMarginAmount: -1000,
        topPendingItems: [],
        recommendation: {},
        daysInStock: 5
      }).type,
      "margin_risk"
    );
    assert.strictEqual(
      buildRecommendation({
        status: "available",
        expectedMarginAmount: 5000,
        topPendingItems: [],
        canPublish: false,
        daysInStock: 60,
        preparationStatus: "done"
      }).type,
      "stagnant_stock"
    );
  });

  test("marca veiculo como vendido com venda aprovada e tenant correto", async () => {
    const queries = [];
    pool.query = async (sql, params) => {
      queries.push({ sql: String(sql), params });
      if (String(sql).includes("FROM vehicles") && String(sql).includes("AND v.dealership_id")) {
        return { rows: [{ id: 9, dealership_id: 7, status: "available", brand: "VW", model: "Polo" }] };
      }
      return { rows: [] };
    };
    pool.connect = async () => ({
      query: async (sql, params) => {
        queries.push({ sql: String(sql), params });
        if (String(sql) === "BEGIN" || String(sql) === "COMMIT" || String(sql) === "ROLLBACK") return { rows: [] };
        if (String(sql).includes("FOR UPDATE")) {
          return { rows: [{ id: 9, dealership_id: 7, status: "available" }] };
        }
        if (String(sql).includes("UPDATE vehicles")) {
          return { rows: [{ id: 9, dealership_id: 7, status: "sold", sold_price: params[1], sale_status: "completed" }] };
        }
        if (String(sql).includes("INSERT INTO sales")) {
          return { rows: [{ id: 22, dealership_id: 7, vehicle_id: 9, price: params[3], approval_status: "approved" }] };
        }
        return { rows: [] };
      },
      release: () => {}
    });

    const result = await vehicleService.markVehicleAsSold(
      9,
      { sold_price: 88000, sold_at: "2026-05-30", notes: "Venda teste" },
      { id: 77, dealership_id: 7, role: "admin" }
    );

    assert.strictEqual(result.vehicle.status, "sold");
    assert.strictEqual(result.sale.approval_status, "approved");
    assert.ok(queries.some((query) => query.sql.includes("UPDATE vehicles") && query.params[5] === 7));
    assert.ok(queries.some((query) => query.sql.includes("INSERT INTO sales") && query.params[0] === 7));
  });

  test("nao permite vender veiculo duas vezes", async () => {
    pool.query = async () => ({
      rows: [{ id: 9, dealership_id: 7, status: "sold", sold_at: "2026-05-01T12:00:00Z" }]
    });

    await assert.rejects(
      () => vehicleService.markVehicleAsSold(9, { sold_price: 88000 }, { id: 77, dealership_id: 7 }),
      (err) => err.payload?.error === "VEHICLE_ALREADY_SOLD"
    );
  });
});
