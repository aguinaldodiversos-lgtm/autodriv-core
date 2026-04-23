const pool = require("../../config/db");

async function createSale(data) {
  const price = data.price ?? data.sale_price;
  if (price === undefined || price === null) {
    throw new Error("price ou sale_price é obrigatório");
  }

  const result = await pool.query(
    `INSERT INTO sales
     (dealership_id, vehicle_id, client_id, user_id, price, approval_status)
     VALUES ($1,$2,$3,$4,$5,'draft')
     RETURNING *`,
    [
      data.dealership_id,
      data.vehicle_id ?? null,
      data.client_id ?? null,
      data.user_id ?? null,
      price
    ]
  );

  return result.rows[0];
}

async function updateApprovalStatus(saleId, dealershipId, status, userId, notes) {
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

  if (!update.rows.length) {
    throw new Error("Venda não encontrada");
  }

  await pool.query(
    `INSERT INTO sales_approval_history
     (sale_id, action, performed_by, notes)
     VALUES ($1,$2,$3,$4)`,
    [saleId, status, userId, notes || null]
  );

  return update.rows[0];
}

async function getSaleById(saleId, dealershipId) {
  const result = await pool.query(
    `SELECT s.*, v.brand AS trade_brand
     FROM sales s
     LEFT JOIN vehicles v
       ON v.id = s.vehicle_id
      AND v.dealership_id = s.dealership_id
     WHERE s.id = $1
       AND s.dealership_id = $2`,
    [saleId, dealershipId]
  );

  return result.rows[0];
}

module.exports = {
  createSale,
  updateApprovalStatus,
  getSaleById
};
