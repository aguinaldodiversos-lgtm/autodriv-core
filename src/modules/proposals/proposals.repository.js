const pool = require("../../config/db");

async function create(data) {
  const result = await pool.query(
    `INSERT INTO proposals
     (dealership_id, lead_id, client_id, vehicle_id, created_by, price, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.dealership_id,
      data.lead_id,
      data.client_id,
      data.vehicle_id,
      data.created_by,
      data.price,
      data.status,
      data.notes
    ]
  );

  return result.rows[0];
}

async function findAll(dealershipId) {
  const result = await pool.query(
    `SELECT * FROM proposals
     WHERE dealership_id = $1
     ORDER BY created_at DESC`,
    [dealershipId]
  );

  return result.rows;
}

async function update(id, dealershipId, data) {
  const result = await pool.query(
    `UPDATE proposals
     SET price=$1,
         status=$2,
         notes=$3,
         updated_at=NOW()
     WHERE id=$4 AND dealership_id=$5
     RETURNING *`,
    [
      data.price,
      data.status,
      data.notes,
      id,
      dealershipId
    ]
  );

  return result.rows[0];
}

async function remove(id, dealershipId) {
  await pool.query(
    `DELETE FROM proposals
     WHERE id=$1 AND dealership_id=$2`,
    [id, dealershipId]
  );
}

module.exports = {
  create,
  findAll,
  update,
  remove
};
