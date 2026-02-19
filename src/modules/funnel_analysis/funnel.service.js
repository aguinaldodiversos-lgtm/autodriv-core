const pool = require("../../config/db");

/* =====================================================
   ANALISAR FUNIL
===================================================== */

async function analyzeFunnel(dealershipId) {

  const stages = [
    "new",
    "responded",
    "qualifying",
    "ready_for_visit",
    "visit_scheduled"
  ];

  const stageCounts = {};

  for (const stage of stages) {
    const result = await pool.query(
      `SELECT COUNT(*)
       FROM lead_ai_state s
       JOIN leads l ON l.id = s.lead_id
       WHERE l.dealership_id = $1
       AND s.stage = $2`,
      [dealershipId, stage]
    );

    stageCounts[stage] = parseInt(result.rows[0].count);
  }

  const conversions = {};

  for (let i = 0; i < stages.length - 1; i++) {
    const current = stageCounts[stages[i]];
    const next = stageCounts[stages[i + 1]];

    conversions[`${stages[i]}_to_${stages[i + 1]}`] =
      current > 0
        ? Number(((next / current) * 100).toFixed(1))
        : 0;
  }

  // Detectar gargalo
  let bottleneckStage = null;
  let lowestConversion = 100;

  for (const key in conversions) {
    if (conversions[key] < lowestConversion) {
      lowestConversion = conversions[key];
      bottleneckStage = key;
    }
  }

  // Recomendação automática
  let recommendation = "";

  if (bottleneckStage) {
    if (bottleneckStage.includes("new_to_responded")) {
      recommendation = "Melhore o tempo de resposta inicial aos leads.";
    } else if (bottleneckStage.includes("responded_to_qualifying")) {
      recommendation = "Treine os vendedores para qualificar melhor os clientes.";
    } else if (bottleneckStage.includes("qualifying_to_ready_for_visit")) {
      recommendation = "Foque em conduzir mais clientes para visita presencial.";
    } else if (bottleneckStage.includes("ready_for_visit_to_visit_scheduled")) {
      recommendation = "Melhore o fechamento do agendamento de visitas.";
    }
  }

  return {
    stage_counts: stageCounts,
    conversion_rates: conversions,
    bottleneck_stage: bottleneckStage,
    recommendation
  };
}

module.exports = {
  analyzeFunnel
};
