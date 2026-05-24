const pool = require("../../config/db");

/**
 * Só cria registo se o veículo existir e pertencer à loja.
 */
async function insertForVehicleInDealership(vehicleId, imageUrl, isMain, dealershipId) {
  const result = await pool.query(
    `INSERT INTO vehicle_images
       (vehicle_id, image_url, is_main)
     SELECT v.id, $2::text, $3::boolean
     FROM vehicles v
     WHERE v.id = $1::int
       AND v.dealership_id = $4::int
     RETURNING *`,
    [vehicleId, imageUrl, isMain, dealershipId]
  );
  return result.rows[0] || null;
}

/**
 * Listagem: junta a vehicles para reforçar o escopo.
 */
async function listByVehicleInDealership(vehicleId, dealershipId) {
  const result = await pool.query(
    `SELECT vi.*
     FROM vehicle_images vi
     INNER JOIN vehicles v
       ON v.id = vi.vehicle_id
      AND v.dealership_id = $2
     WHERE vi.vehicle_id = $1
     ORDER BY vi.is_main DESC, vi.sort_order ASC`,
    [vehicleId, dealershipId]
  );
  return result.rows;
}

module.exports = {
  insertForVehicleInDealership,
  listByVehicleInDealership
};
