const pool = require("../../config/db");

async function getState(leadId) {
  const result = await pool.query(
    `SELECT * FROM lead_ai_state
     WHERE lead_id = $1
     LIMIT 1`,
    [leadId]
  );

  return result.rows[0];
}

async function createState(data) {
  const result = await pool.query(
    `INSERT INTO lead_ai_state
     (dealership_id, lead_id, stage)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [
      data.dealership_id,
      data.lead_id,
      data.stage
    ]
  );

  return result.rows[0];
}

async function updateStage(leadId, stage) {
  const result = await pool.query(
    `UPDATE lead_ai_state
     SET stage = $2,
         updated_at = NOW()
     WHERE lead_id = $1
     RETURNING *`,
    [leadId, stage]
  );

  return result.rows[0];
}

module.exports = {
  getState,
  createState,
  updateStage
};
