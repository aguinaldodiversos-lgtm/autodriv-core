const pool = require("../../config/db");

/* =========================
   CRIAR LEAD
========================= */
async function create(lead) {
  const result = await pool.query(
    `INSERT INTO leads
     (dealership_id,
      client_id,
      vehicle_id,
      assigned_user_id,
      source,
      status,
      notes,
      client_name,
      client_phone,
      origin)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      lead.dealership_id,
      lead.client_id,
      lead.vehicle_id,
      lead.assigned_user_id,
      lead.source,
      lead.status,
      lead.notes,
      lead.client_name,
      lead.client_phone,
      lead.origin
    ]
  );

  return result.rows[0];
}

/* =========================
   LISTAR LEADS (paginado)
========================= */
async function findAll(dealershipId, { limit = 50, offset = 0 } = {}) {
  const result = await pool.query(
    `SELECT *
     FROM leads
     WHERE dealership_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [dealershipId, limit, offset]
  );

  return result.rows;
}

async function countAll(dealershipId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM leads
     WHERE dealership_id = $1`,
    [dealershipId]
  );
  return result.rows[0].total;
}

/* =========================
   ATUALIZAR LEAD
========================= */
async function update(id, dealershipId, data) {
  const result = await pool.query(
    `UPDATE leads
     SET client_id = COALESCE($1, client_id),
         vehicle_id = COALESCE($2, vehicle_id),
         assigned_user_id = COALESCE($3, assigned_user_id),
         source = COALESCE($4, source),
         status = COALESCE($5, status),
         notes = COALESCE($6, notes),
         client_name = COALESCE($7, client_name),
         client_phone = COALESCE($8, client_phone),
         origin = COALESCE($9, origin),
         updated_at = NOW()
     WHERE id = $10
     AND dealership_id = $11
     RETURNING *`,
    [
      data.client_id,
      data.vehicle_id,
      data.assigned_user_id,
      data.source,
      data.status,
      data.notes,
      data.client_name,
      data.client_phone,
      data.origin,
      id,
      dealershipId
    ]
  );

  return result.rows[0];
}

/* =========================
   REMOVER LEAD
========================= */
async function remove(id, dealershipId) {
  await pool.query(
    `DELETE FROM leads
     WHERE id = $1
     AND dealership_id = $2`,
    [id, dealershipId]
  );
}

module.exports = {
  create,
  findAll,
  countAll,
  update,
  remove
};
