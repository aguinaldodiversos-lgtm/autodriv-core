const pool = require("../../config/db");

async function create(vehicle) {
  const result = await pool.query(
    `INSERT INTO vehicles
     (dealership_id, title, brand, model, year, price)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      vehicle.dealership_id,
      vehicle.title,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.price
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

module.exports = {
  create,
  findAll
};
