const pool = require("../../config/db");
const repo = require("./vehicles.repository");
const {
  buildVehicleSlug,
  buildSeoTitle,
  buildSeoDescription
} = require("../../utils/seo");

async function createVehicle(data, user) {
  const dealershipResult = await pool.query(
    `SELECT * FROM dealerships WHERE id = $1`,
    [user.dealershipId]
  );

  const dealership = dealershipResult.rows[0];

  const slug = buildVehicleSlug(data);

  const seoTitle = buildSeoTitle(data, dealership);
  const seoDescription = buildSeoDescription(data, dealership);

  return repo.create({
    dealership_id: user.dealershipId,
    title: data.title,
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
  return repo.findAll(user.dealershipId);
}

module.exports = {
  createVehicle,
  listVehicles
};
