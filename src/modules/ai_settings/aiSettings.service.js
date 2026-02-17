const pool = require("../../config/db");

async function getSettings(dealershipId) {
  let result = await pool.query(
    `SELECT * FROM ai_settings WHERE dealership_id = $1`,
    [dealershipId]
  );

  if (!result.rows.length) {
    const insert = await pool.query(
      `INSERT INTO ai_settings (dealership_id)
       VALUES ($1)
       RETURNING *`,
      [dealershipId]
    );

    return insert.rows[0];
  }

  return result.rows[0];
}

async function updateSettings(dealershipId, data) {
  const { ai_enabled, working_hours_start, working_hours_end } = data;

  const result = await pool.query(
    `UPDATE ai_settings
     SET ai_enabled = COALESCE($2, ai_enabled),
         working_hours_start = COALESCE($3, working_hours_start),
         working_hours_end = COALESCE($4, working_hours_end),
         updated_at = NOW()
     WHERE dealership_id = $1
     RETURNING *`,
    [
      dealershipId,
      ai_enabled,
      working_hours_start,
      working_hours_end
    ]
  );

  return result.rows[0];
}

module.exports = {
  getSettings,
  updateSettings
};
