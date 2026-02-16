const pool = require("../../config/db");

async function create(data) {
  const result = await pool.query(
    `INSERT INTO sales
     (dealership_id, proposal_id, client_id, vehicle_id, sold_by, final_price, payment_method, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.dealership_id,
      data.proposal_id,
      data.client_id,
      data.vehicle_id,
      data.sold_by,
      data.final_price,
      data.payment_method,
      data.status
    ]
  );

  return result.rows[0];
}

async function findAll(dealershipId) {
  const result = await pool.query(
    `SELECT * FROM sales
     WHERE dealership_id = $1
     ORDER BY created_at DESC`,
    [dealershipId]
  );

  return result.rows;
}

module.exports = {
  create,
  findAll
};
