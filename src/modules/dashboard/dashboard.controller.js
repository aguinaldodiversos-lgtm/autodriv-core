const pool = require("../../config/db");

/* =========================
   MÉTRICAS GERAIS DO DASHBOARD
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
   SCORE DE RECUPERAÇÃO DE LEADS
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

module.exports = {
  getStats,
  recoveryStats
};
