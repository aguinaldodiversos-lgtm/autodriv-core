const pool = require("../../config/db");

async function listConversations(user) {
  const result = await pool.query(
    `
    SELECT
      l.id AS lead_id,
      l.name,
      l.phone,
      l.status,
      MAX(c.created_at) AS last_message_at
    FROM leads l
    LEFT JOIN lead_conversations c
      ON c.lead_id = l.id
    WHERE l.dealership_id = $1
    GROUP BY l.id
    ORDER BY last_message_at DESC NULLS LAST
    `,
    [user.dealershipId]
  );

  return result.rows;
}

async function getConversation(user, leadId) {
  const result = await pool.query(
    `
    SELECT
      id,
      role,
      message,
      created_at
    FROM lead_conversations
    WHERE lead_id = $1
    ORDER BY created_at ASC
    `,
    [leadId]
  );

  return result.rows;
}

async function sendHumanMessage(user, leadId, message) {
  const leadResult = await pool.query(
    `SELECT * FROM leads
     WHERE id = $1 AND dealership_id = $2`,
    [leadId, user.dealershipId]
  );

  const lead = leadResult.rows[0];
  if (!lead) throw new Error("Lead não encontrado");

  /* salva mensagem */
  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1, $2, 'human', $3)`,
    [user.dealershipId, leadId, message]
  );

  return {
    success: true
  };
}

module.exports = {
  listConversations,
  getConversation,
  sendHumanMessage
};
