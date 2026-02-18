const pool = require("../../config/db");

/* =========================
   MÉTRICAS GERAIS
========================= */
async function getStats(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const result = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM vehicles WHERE dealership_id = $1) AS total_vehicles,
        (SELECT COUNT(*) FROM leads WHERE dealership_id = $1) AS total_leads,
        (SELECT COUNT(*) FROM leads WHERE dealership_id = $1 AND status = 'new') AS new_leads,
        (SELECT COUNT(*) FROM leads WHERE dealership_id = $1 AND status = 'contacted') AS contacted_leads,
        (SELECT COUNT(*) FROM leads WHERE dealership_id = $1 AND status = 'won') AS sales
      `,
      [dealershipId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
}

/* =========================
   SCORE DE RECUPERAÇÃO
========================= */
async function recoveryStats(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const result = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE l.origin IN ('manual','import')
        ) AS total_old_leads,

        COUNT(*) FILTER (
          WHERE l.origin IN ('manual','import')
          AND s.stage IN ('ready_for_visit','visit_scheduled','handoff_to_human')
        ) AS recovered_leads

      FROM leads l
      LEFT JOIN lead_ai_state s
        ON s.lead_id = l.id
      WHERE l.dealership_id = $1
      `,
      [dealershipId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Recovery stats error:", err);
    res.status(500).json({ error: "Erro ao calcular recuperação" });
  }
}

/* =========================
   ALERTAS INTELIGENTES
========================= */
async function alerts(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const result = await pool.query(
      `
      SELECT
        l.id AS lead_id,
        l.client_name,
        l.score,
        s.stage,
        s.updated_at
      FROM leads l
      JOIN lead_ai_state s
        ON s.lead_id = l.id
      WHERE l.dealership_id = $1
      `,
      [dealershipId]
    );

    const alerts = [];
    const now = new Date();

    for (const lead of result.rows) {
      const updated = new Date(lead.updated_at);
      const diffHours = (now - updated) / (1000 * 60 * 60);

      // Lead quente
      if (lead.score >= 70) {
        alerts.push({
          type: "hot_lead",
          lead_id: lead.lead_id,
          message: "Lead quente aguardando contato"
        });
      }

      // Lead parado em qualificação
      if (lead.stage === "qualifying" && diffHours > 24) {
        alerts.push({
          type: "stalled_lead",
          lead_id: lead.lead_id,
          message: "Lead parado há mais de 24h"
        });
      }

      // IA não conseguiu avançar
      if (lead.stage === "responded" && diffHours > 48) {
        alerts.push({
          type: "ai_stuck",
          lead_id: lead.lead_id,
          message: "IA não conseguiu converter. Assuma manualmente"
        });
      }
    }

    res.json(alerts);
  } catch (err) {
    console.error("Alerts error:", err);
    res.status(500).json({ error: "Erro ao gerar alertas" });
  }
}

module.exports = {
  getStats,
  recoveryStats,
  alerts
};
