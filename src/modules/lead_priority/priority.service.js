const pool = require("../../config/db");

async function calculatePriority(leadId, dealershipId) {
  if (dealershipId == null) {
    throw new Error("dealershipId é obrigatório");
  }

  const leadResult = await pool.query(
    `SELECT l.*, s.stage, s.payment_type AS ai_payment_type
     FROM leads l
     LEFT JOIN lead_ai_state s
       ON s.lead_id = l.id
      AND s.dealership_id = l.dealership_id
     WHERE l.id = $1
       AND l.dealership_id = $2`,
    [leadId, dealershipId]
  );

  if (!leadResult.rows.length) return;

  const lead = leadResult.rows[0];

  let priority = 0;

  priority += lead.score || 0;

  if (lead.stage === "ready_for_visit") priority += 30;
  if (lead.stage === "visit_scheduled") priority += 50;

  if (lead.ai_payment_type === "financing") priority += 15;

  const recent = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM lead_conversations c
     INNER JOIN leads l ON l.id = c.lead_id
     WHERE c.lead_id = $1
       AND l.dealership_id = $2
       AND c.created_at > NOW() - INTERVAL '24 hours'`,
    [leadId, dealershipId]
  );

  if (recent.rows[0].c > 0) {
    priority += 20;
  }

  await pool.query(
    `UPDATE leads
     SET priority_score = $2
     WHERE id = $1
       AND dealership_id = $3`,
    [leadId, priority, dealershipId]
  );

  return priority;
}

async function getTopPriorityLeads(dealershipId) {
  const result = await pool.query(
    `SELECT *
     FROM leads
     WHERE dealership_id = $1
     ORDER BY priority_score DESC NULLS LAST
     LIMIT 20`,
    [dealershipId]
  );

  return result.rows;
}

module.exports = {
  calculatePriority,
  getTopPriorityLeads
};
