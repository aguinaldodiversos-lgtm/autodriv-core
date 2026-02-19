const pool = require("../../config/db");

async function getSaleDetails(saleId) {
  const result = await pool.query(
    `SELECT s.*,
            v.brand, v.model, v.year, v.price AS vehicle_price,
            c.name AS client_name, c.document AS client_document,
            u.name AS seller_name
     FROM sales s
     JOIN vehicles v ON v.id = s.vehicle_id
     JOIN clients c ON c.id = s.client_id
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [saleId]
  );

  return result.rows[0];
}

async function getVehicleIntake(vehicleId) {
  const result = await pool.query(
    `SELECT purchase_value
     FROM vehicle_intake
     WHERE vehicle_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [vehicleId]
  );

  return result.rows[0];
}

async function getSellerMonthlySales(dealershipId, sellerId) {
  const result = await pool.query(
    `SELECT COUNT(*) as total_sales
     FROM sales
     WHERE dealership_id = $1
     AND user_id = $2
     AND approval_status = 'approved'
     AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
    [dealershipId, sellerId]
  );

  return parseInt(result.rows[0].total_sales);
}

module.exports = {
  getSaleDetails,
  getVehicleIntake,
  getSellerMonthlySales
};
