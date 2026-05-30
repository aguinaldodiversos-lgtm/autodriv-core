const pool = require("../../config/db");
const repo = require("./vehicles.repository");
const operationalPanel = require("./vehicleOperationalPanel.service");
const {
  buildVehicleSlug,
  buildSeoTitle,
  buildSeoDescription
} = require("../../utils/seo");

function validateVehicleData(data) {
  if (!data.brand) throw new Error("Marca e obrigatoria");
  if (!data.model) throw new Error("Modelo e obrigatorio");
  if (!data.year) throw new Error("Ano e obrigatorio");
}

function getDealershipId(user) {
  const dealershipId = user.dealership_id;

  if (!dealershipId) {
    throw new Error("Usuario sem dealership_id");
  }

  return dealershipId;
}

function httpError(message, statusCode, payload) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.payload = payload;
  return err;
}

function parseMoneyRequired(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw httpError("Valor de venda invalido", 400, {
      error: "INVALID_SOLD_PRICE",
      message: "Informe um valor de venda maior que zero."
    });
  }
  return amount;
}

async function getDealership(dealershipId) {
  const dealershipResult = await pool.query(
    `SELECT * FROM dealerships WHERE id = $1`,
    [dealershipId]
  );

  const dealership = dealershipResult.rows[0];

  if (!dealership) {
    throw new Error("Concessionaria nao encontrada");
  }

  return dealership;
}

function buildVehiclePayload(data, dealership) {
  validateVehicleData(data);

  const title =
    data.title ||
    `${data.brand} ${data.model} ${data.year}`;

  const vehicleForSeo = {
    ...data,
    title
  };

  return {
    title,
    brand: data.brand,
    model: data.model,
    year: data.year,
    fipe_brand_code: data.fipe_brand_code ?? null,
    fipe_model_code: data.fipe_model_code ?? null,
    fipe_year_code: data.fipe_year_code ?? null,
    fipe_code: data.fipe_code ?? null,
    fipe_reference_month: data.fipe_reference_month ?? null,
    license_plate: data.license_plate ?? null,
    version: data.version ?? null,
    color: data.color ?? null,
    fuel: data.fuel ?? null,
    transmission: data.transmission ?? null,
    mileage: data.mileage ?? null,
    price: data.price ?? 0,
    fipe_price: data.fipe_price ?? null,
    status: data.status || "available",
    is_featured: data.is_featured ?? false,
    slug: buildVehicleSlug(vehicleForSeo),
    seo_title: buildSeoTitle(vehicleForSeo, dealership),
    seo_description: buildSeoDescription(vehicleForSeo, dealership),
    purchase_price: data.purchase_price ?? null,
    acquisition_cost: data.acquisition_cost ?? 0,
    acquisition_source: data.acquisition_source ?? null,
    preparation_status: data.preparation_status || "not_started",
    preparation_cost_estimate: data.preparation_cost_estimate ?? 0,
    preparation_cost_actual: data.preparation_cost_actual ?? 0,
    notes: data.notes ?? null,
    ad_description: data.ad_description ?? null,
    repair_notes: data.repair_notes ?? null,
    preparation_items: Array.isArray(data.preparation_items)
      ? data.preparation_items
      : [],
    documentation_status: data.documentation_status ?? "pending",
    documentation_notes: data.documentation_notes ?? null,
    legal_restriction_status: data.legal_restriction_status ?? "unknown",
    documentation_cost: data.documentation_cost ?? 0,
    transport_cost: data.transport_cost ?? 0,
    commission_cost: data.commission_cost ?? 0,
    other_costs: data.other_costs ?? 0,
    price_strategy: data.price_strategy ?? null,
    ad_quality_score: data.ad_quality_score ?? 0,
    ad_status: data.ad_status || "draft"
  };
}

async function createVehicle(data, user) {
  const dealershipId = getDealershipId(user);
  const dealership = await getDealership(dealershipId);

  const vehicle = await repo.create({
    dealership_id: dealershipId,
    ...buildVehiclePayload(data, dealership)
  });

  if (Array.isArray(data.image_urls) && data.image_urls.length) {
    await repo.addImageUrls(vehicle.id, dealershipId, data.image_urls);
  }

  return repo.findById(vehicle.id, dealershipId);
}

async function listVehicles(user) {
  return repo.findAll(getDealershipId(user));
}

async function listOperationalVehicles(user, query) {
  return operationalPanel.listVehiclesByOperationalView(user, query);
}

async function getVehicleById(id, user) {
  const vehicle = await repo.findById(id, getDealershipId(user));

  if (!vehicle) {
    throw new Error("Veiculo nao encontrado");
  }

  return vehicle;
}

async function updateVehicle(id, data, user) {
  const dealershipId = getDealershipId(user);
  const existing = await repo.findById(id, dealershipId);

  if (!existing) {
    throw new Error("Veiculo nao encontrado");
  }

  const dealership = await getDealership(dealershipId);
  const merged = {
    ...existing,
    ...data
  };

  const updated = await repo.update(
    id,
    dealershipId,
    buildVehiclePayload(merged, dealership)
  );

  if (Array.isArray(data.image_urls)) {
    await repo.addImageUrls(id, dealershipId, data.image_urls);
  }

  return repo.findById(updated.id, dealershipId);
}

async function deleteVehicle(id, user) {
  const removed = await repo.remove(id, getDealershipId(user));

  if (!removed) {
    throw new Error("Veiculo nao encontrado");
  }
}

async function markVehicleAsSold(id, data = {}, user) {
  const dealershipId = getDealershipId(user);
  const existing = await repo.findById(id, dealershipId);
  if (!existing) {
    throw httpError("Veiculo nao encontrado", 404);
  }
  if (existing.status === "sold" || existing.sold_at) {
    throw httpError("Veiculo ja esta marcado como vendido", 409, {
      error: "VEHICLE_ALREADY_SOLD",
      message: "Este veiculo ja esta marcado como vendido."
    });
  }

  const soldPrice = parseMoneyRequired(data.sold_price ?? data.price);
  const soldAt = data.sold_at ? new Date(data.sold_at) : null;
  if (soldAt && Number.isNaN(soldAt.getTime())) {
    throw httpError("Data de venda invalida", 400, {
      error: "INVALID_SOLD_AT",
      message: "Informe uma data de venda valida."
    });
  }

  return repo.markAsSold({
    id,
    dealershipId,
    soldPrice,
    soldAt: soldAt ? soldAt.toISOString() : null,
    soldByUserId: user.id || null,
    notes: data.notes || null
  });
}

module.exports = {
  createVehicle,
  listVehicles,
  listOperationalVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  markVehicleAsSold
};
