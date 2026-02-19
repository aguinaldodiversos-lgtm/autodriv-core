const pool = require("../../../config/db");

async function checkHotLeads(dealershipId) {

  const result = await pool.query(
    `SELECT id, name, assigned_user_id
     FROM leads
     WHERE dealership_id = $1
     AND priority_score >= 70`,
    [dealershipId]
  );

  return result.rows.map(l => ({
    type: "hot_lead",
    message: `🔥 Lead quente: ${l.name}`,
    user_id: l.assigned_user_id
  }));
}

module.exports = {
  checkHotLeads
};
