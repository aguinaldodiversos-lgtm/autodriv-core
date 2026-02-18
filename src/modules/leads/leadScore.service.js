const pool = require("../../config/db");

function calculateScore(state) {
  let score = 0;

  if (!state) return 0;

  switch (state.stage) {
    case "responded":
      score += 10;
      break;
    case "qualifying":
      score += 20;
      break;
    case "ready_for_visit":
      score += 40;
      break;
    case "visit_scheduled":
      score += 60;
      break;
  }

  if (state.payment_type === "financed") {
    score += 15;
  }

  if (state.has_trade_in) {
    score += 15;
  }

  return Math.min(score, 100);
}

function getTemperature(score) {
  if (score <= 30) return "cold";
  if (score <= 60) return "warm";
  return "hot";
}

async function updateLeadScore(leadId) {
  const stateResult = await pool.query(
    `SELECT * FROM lead_ai_state WHERE lead_id = $1`,
    [leadId]
  );

  const state = stateResult.rows[0];
  const score = calculateScore(state);

  await pool.query(
    `UPDATE leads
     SET score = $1
     WHERE id = $2`,
    [score, leadId]
  );

  return {
    lead_id: leadId,
    score,
    temperature: getTemperature(score)
  };
}

async function getLeadScore(leadId) {
  const result = await pool.query(
    `SELECT score FROM leads WHERE id = $1`,
    [leadId]
  );

  const score = result.rows[0]?.score || 0;

  return {
    lead_id: leadId,
    score,
    temperature: getTemperature(score)
  };
}

module.exports = {
  updateLeadScore,
  getLeadScore
};
