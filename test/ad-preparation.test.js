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

const { evaluateContext } = require(path.join("..", "src", "modules", "ad_preparation", "adPreparation.evaluator"));
const repo = require(path.join("..", "src", "modules", "ad_preparation", "adPreparation.repository"));
const service = require(path.join("..", "src", "modules", "ad_preparation", "adPreparation.service"));

const originalRepo = { ...repo };

function restoreRepo() {
  Object.assign(repo, originalRepo);
}

function baseVehicle(overrides = {}) {
  return {
    id: 10,
    dealership_id: 7,
    title: "Honda Civic EXL 2020",
    brand: "Honda",
    model: "Civic",
    version: "EXL",
    year: 2020,
    color: "Prata",
    fuel: "Flex",
    transmission: "Automatico",
    mileage: 55000,
    price: 90000,
    fipe_price: 92000,
    fipe_code: "014093-0",
    fipe_reference_month: "maio de 2026",
    purchase_price: 78000,
    acquisition_cost: 1000,
    preparation_cost_estimate: 1500,
    documentation_cost: 500,
    documentation_status: "checked",
    legal_restriction_status: "clear",
    preparation_status: "done",
    ad_description:
      "Honda Civic EXL 2020 automatico, flex, prata, com bom conjunto de conforto e otima liquidez. Consulte disponibilidade e condicoes com nossa equipe.",
    ...overrides
  };
}

function baseContext(overrides = {}) {
  return {
    vehicle: baseVehicle(overrides.vehicle),
    images: overrides.images || [
      { id: 1, is_main: true, label: "frente" },
      { id: 2, label: "traseira" },
      { id: 3, label: "interior" },
      { id: 4, label: "painel" },
      { id: 5, label: "lateral" },
      { id: 6, label: "porta-malas" },
      { id: 7, label: "motor" },
      { id: 8, label: "odometro" }
    ],
    preparationTasks: overrides.preparationTasks || [
      { id: 1, status: "done", title: "Higienizacao" }
    ],
    overrides: overrides.overrides || []
  };
}

function stubRepoContext(context) {
  repo.loadVehicleContext = async (vehicleId, dealershipId) => {
    assert.strictEqual(Number(vehicleId), 10);
    assert.strictEqual(Number(dealershipId), 7);
    return context;
  };
  repo.saveEvaluation = async () => {};
}

describe("ad preparation evaluator", () => {
  afterEach(restoreRepo);

  test("veiculo sem fotos bloqueia publicacao", () => {
    const result = evaluateContext(baseContext({ images: [] }));
    assert.strictEqual(result.canPublish, false);
    assert.ok(result.blockingReasons.some((item) => item.key === "main_photo_present"));
    assert.ok(result.blockingReasons.some((item) => item.key === "minimum_photos_count"));
  });

  test("menos de 4 fotos bloqueia", () => {
    const result = evaluateContext(baseContext({ images: [{ id: 1, is_main: true }] }));
    assert.strictEqual(result.canPublish, false);
    assert.ok(result.blockingReasons.some((item) => item.key === "minimum_photos_count"));
  });

  test("sem FIPE bloqueia quando obrigatoria", () => {
    const result = evaluateContext(baseContext({ vehicle: { fipe_price: null, fipe_code: null } }));
    assert.strictEqual(result.canPublish, false);
    assert.ok(result.blockingReasons.some((item) => item.key === "fipe_value_present"));
  });

  test("margem negativa bloqueia mesmo com score alto", () => {
    const result = evaluateContext(baseContext({ vehicle: { price: 70000 } }));
    assert.strictEqual(result.canPublish, false);
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.ok(result.blockingReasons.some((item) => item.key === "minimum_margin_ok"));
  });

  test("veiculo completo fica pronto para publicar", () => {
    const result = evaluateContext(baseContext());
    assert.strictEqual(result.canPublish, true);
    assert.strictEqual(result.blockingReasons.length, 0);
    assert.ok(result.score >= 75);
    assert.ok(result.breakdown.photos > 0);
  });

  test("restricao legal critica bloqueia sem permitir score ignorar", () => {
    const result = evaluateContext(baseContext({ vehicle: { legal_restriction_status: "blocked" } }));
    assert.strictEqual(result.canPublish, false);
    assert.ok(result.blockingReasons.some((item) => item.key === "no_legal_restriction"));
  });
});

describe("ad preparation suggestions and guard", () => {
  afterEach(restoreRepo);

  test("descricao rule-based nao inventa FIPE quando ausente", async () => {
    const saved = [];
    stubRepoContext(baseContext({ vehicle: { fipe_price: null } }));
    repo.saveSuggestion = async (payload) => {
      saved.push(payload);
      return payload;
    };

    const suggestion = await service.suggestDescription(10, {
      id: 1,
      dealership_id: 7,
      role: "admin"
    });

    assert.strictEqual(suggestion.suggestionType, "description");
    assert.ok(!/abaixo da fipe/i.test(suggestion.payload.suggestedDescription));
    assert.ok(suggestion.payload.warnings.some((item) => /FIPE/.test(item)));
  });

  test("preco sugerido respeita custo total e margem minima", async () => {
    stubRepoContext(baseContext());
    repo.saveSuggestion = async (payload) => payload;

    const suggestion = await service.suggestPrice(10, {
      id: 1,
      dealership_id: 7,
      role: "admin"
    });

    assert.strictEqual(suggestion.suggestionType, "price");
    assert.ok(suggestion.payload.suggestedPrice >= suggestion.payload.minAcceptablePrice);
    assert.ok(suggestion.payload.confidence > 0);
  });

  test("publish falha com payload AD_NOT_READY_TO_PUBLISH", async () => {
    stubRepoContext(baseContext({ images: [] }));

    await assert.rejects(
      () => service.publishVehicle(10, { id: 1, dealership_id: 7, role: "admin" }),
      (err) =>
        err.statusCode === 422 &&
        err.payload.error === "AD_NOT_READY_TO_PUBLISH" &&
        err.payload.blockingReasons.length > 0
    );
  });

  test("override exige papel elevado e motivo", async () => {
    stubRepoContext(baseContext({ images: [] }));

    await assert.rejects(
      () => service.createOverride(10, { id: 2, dealership_id: 7, role: "seller" }, { reason: "ajuste" }),
      (err) => err.statusCode === 403
    );
    await assert.rejects(
      () => service.createOverride(10, { id: 1, dealership_id: 7, role: "admin" }, { reason: "curto" }),
      (err) => err.statusCode === 400
    );
  });
});
