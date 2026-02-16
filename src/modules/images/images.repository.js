const pool = require("../../config/db");

async function create(vehicleId, imageUrl, isMain = false) {
  const result = await pool.query(
    `INSERT INTO vehicle_images
     (vehicle_id, image_url, is_main)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [vehicleId, imageUrl, isMain]
  );

  return result.rows[0];
}

async function list(vehicleId) {
  const result = await pool.query(
    `SELECT * FROM vehicle_images
     WHERE vehicle_id = $1
     ORDER BY is_main DESC, sort_order ASC`,
    [vehicleId]
  );

  return result.rows;
}

module.exports = {
  create,
  list
};
