const db = require("../../config/db");

async function saveMessage({ dealershipId, leadId, sender, message }) {
  await db.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1, $2, $3, $4)`,
    [dealershipId, leadId, sender, message]
  );
}

async function getRecentHistory(leadId, limit = 15) {
  const { rows } = await db.query(
    `SELECT role, message
     FROM lead_conversations
     WHERE lead_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [leadId, limit]
  );

  return rows.reverse();
}

module.exports = {
  saveMessage,
  getRecentHistory
};
