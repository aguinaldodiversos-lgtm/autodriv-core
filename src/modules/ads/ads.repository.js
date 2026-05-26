const pool = require("../../config/db");

async function create(data) {
  const result = await pool.query(
    `INSERT INTO ads
     (dealership_id, vehicle_id, title, description, platform, status, metadata, updated_at)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,'draft'),COALESCE($7::jsonb,'{}'::jsonb),NOW())
     RETURNING *`,
    [
      data.dealership_id,
      data.vehicle_id,
      data.title,
      data.description,
      data.platform,
      data.status || "draft",
      JSON.stringify(data.metadata || {})
    ]
  );

  return result.rows[0];
}

async function findByVehicle(vehicleId, dealershipId) {
  const result = await pool.query(
    `SELECT * FROM ads
     WHERE vehicle_id = $1 AND dealership_id = $2
     ORDER BY created_at DESC`,
    [vehicleId, dealershipId]
  );

  return result.rows;
}

module.exports = {
  create,
  findByVehicle
};
