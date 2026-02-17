const pool = require("../../config/db");

async function findByDealership(dealershipId) {
  const result = await pool.query(
    `SELECT *
     FROM tasks
     WHERE dealership_id = $1
     ORDER BY created_at DESC`,
    [dealershipId]
  );

  return result.rows;
}

async function completeTask(taskId, dealershipId) {
  const result = await pool.query(
    `UPDATE tasks
     SET status = 'done',
         updated_at = NOW()
     WHERE id = $1
     AND dealership_id = $2
     RETURNING *`,
    [taskId, dealershipId]
  );

  return result.rows[0];
}

module.exports = {
  findByDealership,
  completeTask
};
