const pool = require("../../config/db");

async function create(data) {
  const result = await pool.query(
    `INSERT INTO vehicle_integrations
     (dealership_id, vehicle_id, platform, external_id, status, last_sync)
     VALUES ($1,$2,$3,$4,$5,NOW())
     RETURNING *`,
    [
      data.dealership_id,
      data.vehicle_id,
      data.platform,
      data.external_id,
      data.status
    ]
  );

  return result.rows[0];
}

module.exports = {
  create
};
