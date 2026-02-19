const pool = require("../../config/db");

async function generateInsights(dealershipId) {

  const insights = [];

  // Leads sem resposta há mais de 24h
  const staleLeads = await pool.query(
    `SELECT COUNT(*) 
     FROM leads l
     LEFT JOIN lead_conversations c 
       ON c.lead_id = l.id
     WHERE l.dealership_id = $1
       AND (
         SELECT MAX(created_at)
         FROM lead_conversations
         WHERE lead_id = l.id
       ) < NOW() - INTERVAL '24 hours'`,
    [dealershipId]
  );

  if (parseInt(staleLeads.rows[0].count) > 0) {
    insights.push({
      type: "warning",
      message: `${staleLeads.rows[0].count} leads estão sem resposta há mais de 24h`
    });
  }

  // Muitos leads em qualifying (possível gargalo)
  const qualifying = await pool.query(
    `SELECT COUNT(*)
     FROM lead_ai_state s
     JOIN leads l ON l.id = s.lead_id
     WHERE l.dealership_id = $1
       AND s.stage = 'qualifying'`,
    [dealershipId]
  );

  if (parseInt(qualifying.rows[0].count) > 10) {
    insights.push({
      type: "info",
      message: "Você tem muitos leads em qualificação. Pode haver gargalo na conversão."
    });
  }

  // Poucas visitas agendadas
  const visits = await pool.query(
    `SELECT COUNT(*)
     FROM lead_ai_state s
     JOIN leads l ON l.id = s.lead_id
     WHERE l.dealership_id = $1
       AND s.stage = 'visit_scheduled'`,
    [dealershipId]
  );

  if (parseInt(visits.rows[0].count) < 3) {
    insights.push({
      type: "alert",
      message: "Poucas visitas agendadas este mês. Foque em levar o cliente para a loja."
    });
  }

  return insights;
}

module.exports = {
  generateInsights
};
