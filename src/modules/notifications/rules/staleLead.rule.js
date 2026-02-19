const pool = require("../../../config/db");

async function checkStaleLeads(dealershipId) {

  const result = await pool.query(
    `SELECT l.id, l.name, l.assigned_user_id
     FROM leads l
     WHERE l.dealership_id = $1
     AND (
       SELECT MAX(created_at)
       FROM lead_conversations
       WHERE lead_id = l.id
     ) < NOW() - INTERVAL '24 hours'`,
    [dealershipId]
  );

  return result.rows.map(l => ({
    type: "stale_lead",
    message: `Lead ${l.name} está há mais de 24h sem resposta`,
    user_id: l.assigned_user_id
  }));
}

module.exports = {
  checkStaleLeads
};
