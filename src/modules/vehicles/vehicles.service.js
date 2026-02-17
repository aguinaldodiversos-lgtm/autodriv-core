const pool = require("../../config/db");
const repo = require("./vehicles.repository");
const {
  buildVehicleSlug,
  buildSeoTitle,
  buildSeoDescription
} = require("../../utils/seo");

function validateVehicleData(data) {
  if (!data.brand) throw new Error("Marca é obrigatória");
  if (!data.model) throw new Error("Modelo é obrigatório");
  if (!data.year) throw new Error("Ano é obrigatório");
  if (!data.price) throw new Error("Preço é obrigatório");
}

async function createVehicle(data, user) {
  validateVehicleData(data);

  const dealershipId = user.dealership_id;

  if (!dealershipId) {
    throw new Error("Usuário sem dealership_id");
  }

  const dealershipResult = await pool.query(
    `SELECT * FROM dealerships WHERE id = $1`,
    [dealershipId]
  );

  const dealership = dealershipResult.rows[0];

  if (!dealership) {
    throw new Error("Concessionária não encontrada");
  }

  // título automático
  const title =
    data.title ||
    `${data.brand} ${data.model} ${data.year}`;

  const slug = buildVehicleSlug({
    ...data,
    title
  });

  const seoTitle = buildSeoTitle(
    { ...data, title },
    dealership
  );

  const seoDescription = buildSeoDescription(
    { ...data, title },
    dealership
  );

  return repo.create({
    dealership_id: dealershipId,
    title,
    brand: data.brand,
    model: data.model,
    year: data.year,
    price: data.price,
    slug,
    seo_title: seoTitle,
    seo_description: seoDescription
  });
}

async function listVehicles(user) {
  const dealershipId = user.dealership_id;

  if (!dealershipId) {
    throw new Error("Usuário sem dealership_id");
  }

  return repo.findAll(dealershipId);
}

module.exports = {
  createVehicle,
  listVehicles
};
