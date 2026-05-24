const pool = require("../../config/db");

async function create(vehicle) {
  const result = await pool.query(
    `INSERT INTO vehicles
     (dealership_id, title, brand, model, year, price, fipe_price, status,
      is_featured, slug, seo_title, seo_description, purchase_price,
      acquisition_cost, acquisition_source, preparation_status,
      preparation_cost_estimate, preparation_cost_actual, ad_quality_score, ad_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING *`,
    [
      vehicle.dealership_id,
      vehicle.title,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.price,
      vehicle.fipe_price,
      vehicle.status,
      vehicle.is_featured,
      vehicle.slug,
      vehicle.seo_title,
      vehicle.seo_description,
      vehicle.purchase_price,
      vehicle.acquisition_cost,
      vehicle.acquisition_source,
      vehicle.preparation_status,
      vehicle.preparation_cost_estimate,
      vehicle.preparation_cost_actual,
      vehicle.ad_quality_score,
      vehicle.ad_status
    ]
  );

  return result.rows[0];
}

async function findAll(dealershipId) {
  const result = await pool.query(
    `SELECT * FROM vehicles
     WHERE dealership_id = $1
     ORDER BY created_at DESC`,
    [dealershipId]
  );

  return result.rows;
}

async function findById(id, dealershipId) {
  const result = await pool.query(
    `SELECT *
     FROM vehicles
     WHERE id = $1
       AND dealership_id = $2`,
    [id, dealershipId]
  );

  return result.rows[0];
}

async function update(id, dealershipId, vehicle) {
  const result = await pool.query(
    `UPDATE vehicles
     SET title = $1,
         brand = $2,
         model = $3,
         year = $4,
         price = $5,
         fipe_price = $6,
         status = $7,
         is_featured = $8,
         slug = $9,
         seo_title = $10,
         seo_description = $11,
         purchase_price = $12,
         acquisition_cost = $13,
         acquisition_source = $14,
         preparation_status = $15,
         preparation_cost_estimate = $16,
         preparation_cost_actual = $17,
         ad_quality_score = $18,
         ad_status = $19
     WHERE id = $20
       AND dealership_id = $21
     RETURNING *`,
    [
      vehicle.title,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.price,
      vehicle.fipe_price,
      vehicle.status,
      vehicle.is_featured,
      vehicle.slug,
      vehicle.seo_title,
      vehicle.seo_description,
      vehicle.purchase_price,
      vehicle.acquisition_cost,
      vehicle.acquisition_source,
      vehicle.preparation_status,
      vehicle.preparation_cost_estimate,
      vehicle.preparation_cost_actual,
      vehicle.ad_quality_score,
      vehicle.ad_status,
      id,
      dealershipId
    ]
  );

  return result.rows[0];
}

async function remove(id, dealershipId) {
  const result = await pool.query(
    `DELETE FROM vehicles
     WHERE id = $1
       AND dealership_id = $2
     RETURNING id`,
    [id, dealershipId]
  );

  return result.rows[0];
}

module.exports = {
  create,
  findAll,
  findById,
  update,
  remove
};
