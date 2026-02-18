const pool = require("../../config/db");

/* =========================
   ESTÁGIOS PERMITIDOS
========================= */
const VALID_STAGES = [
  "new",
  "responded",
  "qualifying",
  "ready_for_visit",
  "visit_scheduled",
  "handoff_to_human"
];

/* =========================
   LISTAR PIPELINE (KANBAN)
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
      } else {
        pipeline.new.push(lead);
      }
    }

    res.json(pipeline);
  } catch (err) {
    console.error("Pipeline error:", err);
    res.status(500).json({ error: "Erro ao carregar pipeline" });
  }
}

/* =========================
   ATUALIZAR ESTÁGIO DO LEAD
========================= */
async function updateStage(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const leadId = req.params.id;
    const { stage } = req.body;

    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({
        error: "Estágio inválido"
      });
    }

    // garante que o lead pertence à loja
    const leadCheck = await pool.query(
      `SELECT id FROM leads
       WHERE id = $1
       AND dealership_id = $2`,
      [leadId, dealershipId]
    );

    if (!leadCheck.rows.length) {
      return res.status(404).json({
        error: "Lead não encontrado"
      });
    }

    await pool.query(
      `
      UPDATE lead_ai_state
      SET stage = $1,
          updated_at = NOW()
      WHERE lead_id = $2
      AND dealership_id = $3
      `,
      [stage, leadId, dealershipId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Update stage error:", err);
    res.status(500).json({ error: "Erro ao atualizar estágio" });
  }
}

module.exports = {
  getPipeline,
  updateStage
};
