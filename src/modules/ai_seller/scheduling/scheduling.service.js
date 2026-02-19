const pool = require("../../../config/db");

async function detectVisitScheduling(reply, leadId) {
  const lower = reply.toLowerCase();

  if (
    lower.includes("amanhã") ||
    lower.includes("hoje") ||
    lower.includes("sábado")
  ) {
    await pool.query(
      `UPDATE lead_ai_state
       SET stage = 'visit_scheduled',
           visit_scheduled_at = NOW(),
           updated_at = NOW()
       WHERE lead_id = $1`,
      [leadId]
    );
  }
}

module.exports = {
  detectVisitScheduling
};
