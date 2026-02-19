const pool = require("../../config/db");

async function getSellerPerformance(dealershipId) {

  const result = await pool.query(
    `SELECT
        u.id,
        u.name,
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN s.stage = 'visit_scheduled' THEN 1 ELSE 0 END) as visits
     FROM users u
     LEFT JOIN leads l
       ON l.assigned_user_id = u.id
     LEFT JOIN lead_ai_state s
       ON s.lead_id = l.id
     WHERE u.dealership_id = $1
       AND u.role = 'seller'
     GROUP BY u.id, u.name`,
    [dealershipId]
  );

  return result.rows;
}

module.exports = {
  getSellerPerformance
};
