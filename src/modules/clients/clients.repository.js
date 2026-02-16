const pool = require("../../config/db");

async function create(client) {
  const result = await pool.query(
    `INSERT INTO clients
     (dealership_id, name, phone, email, cpf_cnpj, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      client.dealership_id,
      client.name,
      client.phone,
      client.email,
      client.cpf_cnpj,
      client.notes
    ]
  );

  return result.rows[0];
}

async function findAll(dealershipId) {
  const result = await pool.query(
    `SELECT * FROM clients
     WHERE dealership_id = $1
     ORDER BY created_at DESC`,
    [dealershipId]
  );

  return result.rows;
}

async function findById(id, dealershipId) {
  const result = await pool.query(
    `SELECT * FROM clients
     WHERE id = $1 AND dealership_id = $2`,
    [id, dealershipId]
  );

  return result.rows[0];
}

async function update(id, dealershipId, data) {
  const result = await pool.query(
    `UPDATE clients
     SET name=$1,
         phone=$2,
         email=$3,
         cpf_cnpj=$4,
         notes=$5
     WHERE id=$6 AND dealership_id=$7
     RETURNING *`,
    [
      data.name,
      data.phone,
      data.email,
      data.cpf_cnpj,
      data.notes,
      id,
      dealershipId
    ]
  );

  return result.rows[0];
}

async function remove(id, dealershipId) {
  await pool.query(
    `DELETE FROM clients
     WHERE id=$1 AND dealership_id=$2`,
    [id, dealershipId]
  );
}

module.exports = {
  create,
  findAll,
  findById,
  update,
  remove
};
