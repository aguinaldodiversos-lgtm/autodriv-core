const pool = require("../../config/db");

async function listConversations(user) {
  const result = await pool.query(
    `
    SELECT
      l.id AS lead_id,
      l.client_name AS name,
      l.client_phone AS phone,
      l.status,
      MAX(c.created_at) AS last_message_at
    FROM leads l
    LEFT JOIN lead_conversations c
      ON c.lead_id = l.id
    WHERE l.dealership_id = $1
    GROUP BY l.id
    ORDER BY last_message_at DESC NULLS LAST
    `,
    [user.dealership_id]
  );

  return result.rows;
}

async function getConversation(user, leadId) {
  const result = await pool.query(
    `
    SELECT
      id,
      sender,
      message,
      created_at
    FROM lead_conversations
    WHERE lead_id = $1
      AND dealership_id = $2
    ORDER BY created_at ASC
    `,
    [leadId, user.dealership_id]
  );

  return result.rows;
}

async function sendHumanMessage(user, leadId, message) {
  const leadResult = await pool.query(
    `SELECT id FROM leads
     WHERE id = $1 AND dealership_id = $2`,
    [leadId, user.dealership_id]
  );

  const lead = leadResult.rows[0];
  if (!lead) throw new Error("Lead não encontrado");

  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, sender, message)
     VALUES ($1, $2, 'human', $3)`,
    [user.dealership_id, leadId, message]
  );

  return { success: true };
}

module.exports = {
  listConversations,
  getConversation,
  sendHumanMessage
};
