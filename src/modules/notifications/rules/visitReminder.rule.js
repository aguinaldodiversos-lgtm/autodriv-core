const pool = require("../../../config/db");

async function checkTodayVisits(dealershipId) {

  const result = await pool.query(
    `SELECT l.name, l.assigned_user_id
     FROM lead_ai_state s
     JOIN leads l ON l.id = s.lead_id
     WHERE l.dealership_id = $1
     AND s.visit_scheduled_at::date = CURRENT_DATE`,
    [dealershipId]
  );

  return result.rows.map(l => ({
    type: "visit_today",
    message: `📅 Visita agendada hoje com ${l.name}`,
    user_id: l.assigned_user_id
  }));
}

module.exports = {
  checkTodayVisits
};
