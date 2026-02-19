const pool = require("../../config/db");

async function getPendingApprovals(dealershipId) {

  const result = await pool.query(
    `SELECT s.id,
            s.sale_price,
            s.created_at,
            v.brand,
            v.model,
            v.year,
            c.name AS client_name,
            u.name AS seller_name
     FROM sales s
     JOIN vehicles v ON v.id = s.vehicle_id
     JOIN clients c ON c.id = s.client_id
     JOIN users u ON u.id = s.user_id
     WHERE s.dealership_id = $1
     AND s.approval_status = 'pending'
     ORDER BY s.created_at ASC`,
    [dealershipId]
  );

  return result.rows;
}

module.exports = {
  getPendingApprovals
};
