const pool = require("../../config/db");

/* =========================
   LISTAR PIPELINE
========================= */
async function getPipeline(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const result = await pool.query(
      `
      SELECT
        l.id,
        l.client_name,
        l.client_phone,
        l.status,
        l.created_at,
        s.stage
      FROM leads l
      LEFT JOIN lead_ai_state s
        ON s.lead_id = l.id
      WHERE l.dealership_id = $1
      ORDER BY l.created_at DESC
      `,
      [dealershipId]
    );

    const leads = result.rows;

    const pipeline = {
      new: [],
      responded: [],
      qualifying: [],
      ready_for_visit: [],
      visit_scheduled: [],
      handoff_to_human: []
    };

    for (const lead of leads) {
      const stage = lead.stage || "new";
      if (pipeline[stage]) {
        pipeline[stage].push(lead);
      }
    }

    res.json(pipeline);
  } catch (err) {
    console.error("Pipeline error:", err);
    res.status(500).json({ error: "Erro ao carregar pipeline" });
  }
}

module.exports = {
  getPipeline
};
