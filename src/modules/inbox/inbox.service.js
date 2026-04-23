const pool = require("../../config/db");

function dealershipId(user) {
  return user.dealership_id;
}

async function listConversations(user, { limit = 100, offset = 0 } = {}) {
  const did = dealershipId(user);
  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 500);
  const off = Math.max(parseInt(String(offset), 10) || 0, 0);
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
     AND c.dealership_id = l.dealership_id
    WHERE l.dealership_id = $1
    GROUP BY l.id
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT $2 OFFSET $3
    `,
    [did, lim, off]
  );

  return result.rows;
}

async function getConversation(user, leadId) {
  const did = dealershipId(user);
  const leadCheck = await pool.query(
    `SELECT id FROM leads WHERE id = $1 AND dealership_id = $2`,
    [leadId, did]
  );
  if (!leadCheck.rows.length) {
    throw new Error("Lead não encontrado");
  }

  const result = await pool.query(
    `
    SELECT
      c.id,
      c.role,
      c.message,
      c.created_at
    FROM lead_conversations c
    INNER JOIN leads l ON l.id = c.lead_id
    WHERE c.lead_id = $1
      AND l.dealership_id = $2
      AND c.dealership_id = l.dealership_id
    ORDER BY c.created_at ASC
    LIMIT 1000
    `,
    [leadId, did]
  );

  return result.rows;
}

async function sendHumanMessage(user, leadId, message) {
  const did = dealershipId(user);
  const leadResult = await pool.query(
    `SELECT * FROM leads
     WHERE id = $1 AND dealership_id = $2`,
    [leadId, did]
  );

  const lead = leadResult.rows[0];
  if (!lead) throw new Error("Lead não encontrado");

  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1, $2, 'human', $3)`,
    [did, leadId, message]
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
