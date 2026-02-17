const pool = require("../../../config/db");

async function createHotLeadTask(leadId, dealershipId) {
  const existing = await pool.query(
    `SELECT id FROM tasks
     WHERE lead_id = $1
     AND status = 'pending'
     LIMIT 1`,
    [leadId]
  );

  if (existing.rows.length > 0) return;

  await pool.query(
    `INSERT INTO tasks
     (dealership_id, lead_id, title, type, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())`,
    [
      dealershipId,
      leadId,
      "Lead quente: entrar em contato",
      "hot_lead"
    ]
  );
}

module.exports = {
  createHotLeadTask
};
