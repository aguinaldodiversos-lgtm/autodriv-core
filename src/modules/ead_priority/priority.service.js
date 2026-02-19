const pool = require("../../config/db");

async function calculatePriority(leadId) {
  const leadResult = await pool.query(
    `SELECT l.*, s.stage
     FROM leads l
     LEFT JOIN lead_ai_state s
       ON s.lead_id = l.id
     WHERE l.id = $1`,
    [leadId]
  );

  if (!leadResult.rows.length) return;

  const lead = leadResult.rows[0];

  let priority = 0;

  // Score base
  priority += lead.score || 0;

  // Se estágio avançado
  if (lead.stage === "ready_for_visit") priority += 30;
  if (lead.stage === "visit_scheduled") priority += 50;

  // Se cliente falou sobre financiamento
  if (lead.payment_type === "financing") priority += 15;

  // Se houve resposta nas últimas 24h
  const recent = await pool.query(
    `SELECT COUNT(*) FROM lead_conversations
     WHERE lead_id = $1
     AND created_at > NOW() - INTERVAL '24 hours'`,
    [leadId]
  );

  if (parseInt(recent.rows[0].count) > 0) {
    priority += 20;
  }

  await pool.query(
    `UPDATE leads
     SET priority_score = $2
     WHERE id = $1`,
    [leadId, priority]
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
