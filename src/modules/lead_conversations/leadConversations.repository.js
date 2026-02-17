const pool = require("../../config/db");

async function addMessage(data) {
  const result = await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [
      data.dealership_id,
      data.lead_id,
      data.role,
      data.message
    ]
  );

  return result.rows[0];
}

async function getRecentMessages(leadId, limit = 10) {
  const result = await pool.query(
    `SELECT role, message
     FROM lead_conversations
     WHERE lead_id = $1
     ORDER BY id DESC
     LIMIT $2`,
    [leadId, limit]
  );

  return result.rows.reverse();
}

module.exports = {
  addMessage,
  getRecentMessages
};
