const pool = require("../../config/db");

/**
 * Só cria registo se o veículo existir e pertencer à loja.
 */
async function insertForVehicleInDealership(vehicleId, imageUrl, isMain, dealershipId) {
  const result = await pool.query(
    `INSERT INTO vehicle_images
       (dealership_id, vehicle_id, image_url, is_main, sort_order)
     SELECT $4::int,
            v.id,
            $2::text,
            ($3::boolean OR NOT EXISTS (
              SELECT 1
              FROM vehicle_images existing_main
              WHERE existing_main.vehicle_id = v.id
            )),
            COALESCE(
              (
                SELECT MAX(existing.sort_order) + 1
                FROM vehicle_images existing
                WHERE existing.vehicle_id = v.id
              ),
              0
            )
     FROM vehicles v
     WHERE v.id = $1::int
       AND v.dealership_id = $4::int
     ON CONFLICT (vehicle_id, image_url)
     DO UPDATE SET
       dealership_id = EXCLUDED.dealership_id
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
