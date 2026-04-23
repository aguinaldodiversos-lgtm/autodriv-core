const db = require("../../config/db");

async function saveMessage({ dealershipId, leadId, sender, message }) {
  await db.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1, $2, $3, $4)`,
    [dealershipId, leadId, sender, message]
  );
}

async function getRecentHistory(leadId, dealershipId, limit = 15) {
  const { rows } = await db.query(
    `SELECT role, message
     FROM lead_conversations
     WHERE lead_id = $1
       AND dealership_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [leadId, dealershipId, limit]
  );

  return rows.reverse();
}

module.exports = {
  saveMessage,
  getRecentHistory
};
