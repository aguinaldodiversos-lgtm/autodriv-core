const pool = require("../../config/db");

async function createTrial(dealershipId) {
  const existing = await pool.query(
    `SELECT trial_used FROM subscriptions
     WHERE dealership_id = $1`,
    [dealershipId]
  );

  if (existing.rows.length && existing.rows[0].trial_used) {
    throw new Error("Trial já utilizado anteriormente.");
  }

  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + 15);

  await pool.query(
    `INSERT INTO subscriptions
     (dealership_id, plan, status, trial_used, created_at, current_period_end)
     VALUES ($1, 'trial', 'active', true, NOW(), $2)
     ON CONFLICT (dealership_id)
     DO UPDATE SET
       plan = 'trial',
       status = 'active',
       trial_used = true,
       created_at = NOW(),
       current_period_end = $2`,
    [dealershipId, endDate]
  );
}

module.exports = {
  createTrial
};
