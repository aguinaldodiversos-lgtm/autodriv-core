const pool = require("../../../config/db");

async function calculateLeadScore(leadId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM lead_conversations
     WHERE lead_id = $1`,
    [leadId]
  );

  const totalMessages = parseInt(result.rows[0].count);

  let score = 0;

  if (totalMessages >= 3) score += 10;
  if (totalMessages >= 6) score += 20;
  if (totalMessages >= 10) score += 30;

  await pool.query(
    `UPDATE leads SET score = $2 WHERE id = $1`,
    [leadId, score]
  );

  return score;
}

module.exports = {
  calculateLeadScore
};
