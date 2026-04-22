const pool = require("../../config/db");

async function createSale(data) {
  const result = await pool.query(
    `INSERT INTO sales
     (dealership_id, vehicle_id, client_id, user_id, sale_price)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [
      data.dealership_id,
      data.vehicle_id,
      data.client_id,
      data.user_id,
      data.sale_price
    ]
  );

  return result.rows[0];
}

async function updateApprovalStatus(saleId, status, userId, notes, dealershipId) {
  if (dealershipId === undefined || dealershipId === null) {
    throw new Error("dealership_id obrigatório em updateApprovalStatus");
  }

  const update = await pool.query(
    `UPDATE sales
     SET approval_status = $1,
         approved_by = $2,
         approved_at = NOW(),
         rejection_reason = $3
     WHERE id = $4
       AND dealership_id = $5
     RETURNING *`,
    [status, userId, notes || null, saleId, dealershipId]
  );

  if (!update.rows[0]) return null;

  await pool.query(
    `INSERT INTO sales_approval_history
     (sale_id, action, performed_by, notes)
     VALUES ($1,$2,$3,$4)`,
    [saleId, status, userId, notes || null]
  );

  return update.rows[0];
}

async function getSaleById(saleId, dealershipId) {
  if (dealershipId === undefined || dealershipId === null) {
    throw new Error("dealership_id obrigatório em getSaleById");
  }

  const result = await pool.query(
    `SELECT *
     FROM sales
     WHERE id = $1
       AND dealership_id = $2`,
    [saleId, dealershipId]
  );

  return result.rows[0];
}

module.exports = {
  createSale,
  updateApprovalStatus,
  getSaleById
};
