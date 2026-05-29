const pool = require("../../config/db");

async function create(data) {
  const result = await pool.query(
    `INSERT INTO vehicle_integrations
     (dealership_id, vehicle_id, platform, external_id, status, last_sync,
      payload, status_detail, external_url, last_error, last_error_at,
      last_attempt_at, published_at, attempt_count, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW(),$6::jsonb,$7,$8,$9,$10,NOW(),$11,COALESCE($12,1),NOW())
     RETURNING *`,
    [
      data.dealership_id,
      data.vehicle_id,
      data.platform,
      data.external_id,
      data.status,
      JSON.stringify(data.payload || {}),
      data.status_detail || null,
      data.external_url || null,
      data.last_error || null,
      data.last_error_at || null,
      data.published_at || null,
      data.attempt_count || 1
    ]
  );

  return result.rows[0];
}

async function createAttempt(data) {
  return create({
    ...data,
    status: data.status || "pending",
    attempt_count: 1
  });
}

async function markAttemptPublished(id, dealershipId, data = {}) {
  const result = await pool.query(
    `UPDATE vehicle_integrations
     SET external_id = COALESCE($3, external_id),
         external_url = COALESCE($4, external_url),
         status = $5,
         status_detail = COALESCE($6, status_detail),
         payload = COALESCE($7::jsonb, payload),
         last_error = NULL,
         last_error_at = NULL,
         published_at = CASE WHEN $5 = 'published' THEN NOW() ELSE published_at END,
         last_sync = NOW(),
         updated_at = NOW()
     WHERE id = $1 AND dealership_id = $2
     RETURNING *`,
    [
      id,
      dealershipId,
      data.external_id || null,
      data.external_url || null,
      data.status || "published",
      data.status_detail || null,
      data.payload ? JSON.stringify(data.payload) : null
    ]
  );
  return result.rows[0] || null;
}

async function markAttemptFailed(id, dealershipId, data = {}) {
  const result = await pool.query(
    `UPDATE vehicle_integrations
     SET status = $3,
         status_detail = COALESCE($4, status_detail),
         last_error = $5,
         last_error_at = NOW(),
         last_sync = NOW(),
         updated_at = NOW()
     WHERE id = $1 AND dealership_id = $2
     RETURNING *`,
    [
      id,
      dealershipId,
      data.status || "failed",
      data.status_detail || null,
      data.last_error || "Erro ao publicar anuncio"
    ]
  );
  return result.rows[0] || null;
}

async function listByVehicle(vehicleId, dealershipId) {
  const result = await pool.query(
    `SELECT *
     FROM vehicle_integrations
     WHERE vehicle_id = $1 AND dealership_id = $2
     ORDER BY created_at DESC, id DESC`,
    [vehicleId, dealershipId]
  );

  return result.rows;
}

module.exports = {
  create,
  createAttempt,
  markAttemptPublished,
  markAttemptFailed,
  listByVehicle
};
