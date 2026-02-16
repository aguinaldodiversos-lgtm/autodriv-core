const pool = require("../../config/db");

async function create(lead) {
  const result = await pool.query(
    `INSERT INTO leads
     (dealership_id, client_id, vehicle_id, assigned_user_id, source, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      lead.dealership_id,
      lead.client_id,
      lead.vehicle_id,
      lead.assigned_user_id,
      lead.source,
      lead.status,
      lead.notes
    ]
  );

  return result.rows[0];
}

async function findAll(dealershipId) {
  const result = await pool.query(
    `SELECT * FROM leads
     WHERE dealership_id = $1
     ORDER BY created_at DESC`,
    [dealershipId]
  );

  return result.rows;
}

async function update(id, dealershipId, data) {
  const result = await pool.query(
    `UPDATE leads
     SET client_id=$1,
         vehicle_id=$2,
         assigned_user_id=$3,
         source=$4,
         status=$5,
         notes=$6,
         updated_at=NOW()
     WHERE id=$7 AND dealership_id=$8
     RETURNING *`,
    [
      data.client_id,
      data.vehicle_id,
      data.assigned_user_id,
      data.source,
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
    `DELETE FROM leads
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
