const pool = require("../../config/db");

async function createContract(data) {
  const result = await pool.query(
    `INSERT INTO contracts
     (dealership_id, sale_id, vehicle_id, client_id, created_by)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [
      data.dealership_id,
      data.sale_id,
      data.vehicle_id,
      data.client_id,
      data.user_id
    ]
  );

  return result.rows[0];
}

async function getSaleById(saleId) {
  const result = await pool.query(
    `SELECT * FROM sales WHERE id = $1`,
    [saleId]
  );

  return result.rows[0];
}

module.exports = {
  createContract,
  getSaleById
};
