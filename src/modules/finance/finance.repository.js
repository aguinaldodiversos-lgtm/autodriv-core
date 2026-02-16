const pool = require("../../config/db");

async function create(data) {
  const result = await pool.query(
    `INSERT INTO financial_transactions
     (dealership_id, type, category, description, amount, due_date, status, related_sale_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.dealership_id,
      data.type,
      data.category,
      data.description,
      data.amount,
      data.due_date,
      data.status,
      data.related_sale_id
    ]
  );

  return result.rows[0];
}

async function findAll(dealershipId) {
  const result = await pool.query(
    `SELECT * FROM financial_transactions
     WHERE dealership_id = $1
     ORDER BY created_at DESC`,
    [dealershipId]
  );

  return result.rows;
}

async function markAsPaid(id, dealershipId) {
  const result = await pool.query(
    `UPDATE financial_transactions
     SET status='paid',
         paid_date=NOW()
     WHERE id=$1 AND dealership_id=$2
     RETURNING *`,
    [id, dealershipId]
  );

  return result.rows[0];
}

async function getSummary(dealershipId) {
  const result = await pool.query(
    `
    SELECT
      SUM(CASE WHEN type='income' AND status='paid' THEN amount ELSE 0 END) AS total_income,
      SUM(CASE WHEN type='expense' AND status='paid' THEN amount ELSE 0 END) AS total_expense
    FROM financial_transactions
    WHERE dealership_id = $1
    `,
    [dealershipId]
  );

  return result.rows[0];
}

module.exports = {
  create,
  findAll,
  markAsPaid,
  getSummary
};
