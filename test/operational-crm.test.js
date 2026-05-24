const { describe, test } = require("node:test");
const assert = require("node:assert");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const {
  normalizeIncomingLead
} = require("../src/modules/lead_sources/leadSources.service");
const {
  calculateVehicleSignals
} = require("../src/modules/stock_intelligence/stockIntelligence.service");

describe("operational CRM primitives", () => {
  test("normaliza payloads de Meta Lead Ads em contrato interno de lead", () => {
    const lead = normalizeIncomingLead(
      {
        id: "meta-123",
        field_data: [
          { name: "full_name", values: ["Ana Silva"] },
          { name: "phone", values: ["(11) 99999-8888"] },
          { name: "email", values: ["ana@example.com"] },
          { name: "ad_name", values: ["Honda Civic Touring"] }
        ]
      },
      "meta"
    );

    assert.strictEqual(lead.external_id, "meta-123");
    assert.strictEqual(lead.name, "Ana Silva");
    assert.strictEqual(lead.phone, "11999998888");
    assert.strictEqual(lead.email, "ana@example.com");
    assert.strictEqual(lead.desired_vehicle, "Honda Civic Touring");
  });

  test("sinaliza estoque parado, anuncio fraco e margem negativa", () => {
    const signals = calculateVehicleSignals({
      id: 1,
      title: "Civic 2020",
      price: 80000,
      fipe_price: 70000,
      purchase_price: 76000,
      acquisition_cost: 3000,
      preparation_cost_actual: 2500,
      preparation_cost_estimate: 0,
      preparation_status: "doing",
      ad_quality_score: 45,
      days_in_stock: 75
    });

    assert.strictEqual(signals.projected_margin, -1500);
    assert.ok(signals.fipe_difference_percent > 14);
    assert.ok(signals.suggestions.some((item) => item.type === "aging_stock"));
    assert.ok(signals.suggestions.some((item) => item.type === "bad_ad_quality"));
    assert.ok(signals.suggestions.some((item) => item.type === "negative_margin"));
  });
});
