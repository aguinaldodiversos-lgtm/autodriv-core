const pool = require("../../config/db");
const repo = require("./vehicles.repository");
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
    ad_quality_score: data.ad_quality_score ?? 0,
    ad_status: data.ad_status || "draft"
  };
}

async function createVehicle(data, user) {
  const dealershipId = getDealershipId(user);
  const dealership = await getDealership(dealershipId);

  return repo.create({
    dealership_id: dealershipId,
    ...buildVehiclePayload(data, dealership)
  });
}

async function listVehicles(user) {
  return repo.findAll(getDealershipId(user));
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

  return repo.update(
    id,
    dealershipId,
    buildVehiclePayload(merged, dealership)
  );
}

async function deleteVehicle(id, user) {
  const removed = await repo.remove(id, getDealershipId(user));

  if (!removed) {
    throw new Error("Veiculo nao encontrado");
  }
}

module.exports = {
  createVehicle,
  listVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle
};
