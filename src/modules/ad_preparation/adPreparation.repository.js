const pool = require("../../config/db");

async function loadVehicleContext(vehicleId, dealershipId) {
  const { rows } = await pool.query(
    `SELECT
       v.*,
       FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(v.entry_date, v.created_at))) / 86400)::int AS days_in_stock,
       COUNT(DISTINCT vi.id)::int AS image_count,
       BOOL_OR(COALESCE(vi.is_main, false) OR COALESCE(vi.is_cover, false)) AS has_main_image,
       COUNT(DISTINCT vpt.id) FILTER (WHERE vpt.status <> 'done' AND vpt.status <> 'cancelled')::int AS pending_preparation_tasks,
       COUNT(DISTINCT vpt.id) FILTER (WHERE vpt.status = 'done')::int AS completed_preparation_tasks,
       SUM(COALESCE(vpt.estimated_cost, 0)) FILTER (WHERE vpt.status <> 'cancelled') AS preparation_estimated_from_tasks,
       SUM(COALESCE(vpt.actual_cost, 0)) FILTER (WHERE vpt.status <> 'cancelled') AS preparation_actual_from_tasks
     FROM vehicles v
     LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id
     LEFT JOIN vehicle_preparation_tasks vpt ON vpt.vehicle_id = v.id AND vpt.dealership_id = v.dealership_id
     WHERE v.id = $1 AND v.dealership_id = $2
     GROUP BY v.id`,
    [vehicleId, dealershipId]
  );
  const vehicle = rows[0];
  if (!vehicle) return null;

  const images = await pool.query(
    `SELECT *
     FROM vehicle_images
     WHERE vehicle_id = $1 AND dealership_id = $2
     ORDER BY is_main DESC NULLS LAST, sort_order ASC NULLS LAST, id ASC`,
    [vehicleId, dealershipId]
  );
  const preparationTasks = await pool.query(
    `SELECT *
     FROM vehicle_preparation_tasks
     WHERE vehicle_id = $1 AND dealership_id = $2
     ORDER BY status ASC, created_at DESC`,
    [vehicleId, dealershipId]
  );
  const overrides = await pool.query(
    `SELECT *
     FROM publication_overrides
     WHERE vehicle_id = $1
       AND dealership_id = $2
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC`,
    [vehicleId, dealershipId]
  );

  return {
    vehicle,
    images: images.rows,
    preparationTasks: preparationTasks.rows,
    overrides: overrides.rows
  };
}

async function saveEvaluation({ vehicleId, dealershipId, checks, score }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const check of checks) {
      await client.query(
        `INSERT INTO ad_preparation_checks
          (vehicle_id, dealership_id, category, check_key, status, severity,
           required, weight, current_value, expected_value, message, action_hint,
           manually_approved_by, manually_approved_at, manual_approval_reason,
           last_checked_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,NOW(),NOW())
         ON CONFLICT (vehicle_id, check_key)
         DO UPDATE SET
           category = EXCLUDED.category,
           status = EXCLUDED.status,
           severity = EXCLUDED.severity,
           required = EXCLUDED.required,
           weight = EXCLUDED.weight,
           current_value = EXCLUDED.current_value,
           expected_value = EXCLUDED.expected_value,
           message = EXCLUDED.message,
           action_hint = EXCLUDED.action_hint,
           manually_approved_by = EXCLUDED.manually_approved_by,
           manually_approved_at = EXCLUDED.manually_approved_at,
           manual_approval_reason = EXCLUDED.manual_approval_reason,
           last_checked_at = NOW(),
           updated_at = NOW()`,
        [
          vehicleId,
          dealershipId,
          check.category,
          check.key,
          check.status,
          check.severity,
          check.required,
          check.weight,
          JSON.stringify(check.currentValue ?? {}),
          JSON.stringify(check.expectedValue ?? {}),
          check.message,
          check.actionHint,
          check.manuallyApprovedBy || null,
          check.manuallyApprovedAt || null,
          check.manualApprovalReason || null
        ]
      );
    }

    await client.query(
      `INSERT INTO ad_preparation_scores
        (vehicle_id, dealership_id, score, grade, can_publish, status,
         blocking_reasons, warnings, breakdown, computed_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,NOW(),NOW())
       ON CONFLICT (vehicle_id)
       DO UPDATE SET
         score = EXCLUDED.score,
         grade = EXCLUDED.grade,
         can_publish = EXCLUDED.can_publish,
         status = EXCLUDED.status,
         blocking_reasons = EXCLUDED.blocking_reasons,
         warnings = EXCLUDED.warnings,
         breakdown = EXCLUDED.breakdown,
         computed_at = NOW(),
         updated_at = NOW()`,
      [
        vehicleId,
        dealershipId,
        score.score,
        score.grade,
        score.canPublish,
        score.status,
        JSON.stringify(score.blockingReasons),
        JSON.stringify(score.warnings),
        JSON.stringify(score.breakdown)
      ]
    );

    await client.query(
      `UPDATE vehicles
       SET ad_quality_score = $1,
           ad_status = $2,
           ad_preparation_status = $3
       WHERE id = $4 AND dealership_id = $5`,
      [
        score.score,
        score.canPublish ? "ready_to_publish" : "blocked_incomplete",
        score.canPublish ? "ready" : "blocked",
        vehicleId,
        dealershipId
      ]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getPreparation(vehicleId, dealershipId) {
  const score = await pool.query(
    `SELECT *
     FROM ad_preparation_scores
     WHERE vehicle_id = $1 AND dealership_id = $2`,
    [vehicleId, dealershipId]
  );
  const checks = await pool.query(
    `SELECT *
     FROM ad_preparation_checks
     WHERE vehicle_id = $1 AND dealership_id = $2
     ORDER BY category ASC, check_key ASC`,
    [vehicleId, dealershipId]
  );
  const suggestions = await pool.query(
    `SELECT *
     FROM vehicle_commercial_suggestions
     WHERE vehicle_id = $1
       AND dealership_id = $2
       AND status = 'suggested'
     ORDER BY created_at DESC
     LIMIT 20`,
    [vehicleId, dealershipId]
  );
  return {
    score: score.rows[0] || null,
    checks: checks.rows,
    suggestions: suggestions.rows
  };
}

async function saveSuggestion({ vehicleId, dealershipId, suggestionType, provider, payload }) {
  const { rows } = await pool.query(
    `INSERT INTO vehicle_commercial_suggestions
      (vehicle_id, dealership_id, suggestion_type, provider, payload, status, updated_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,'suggested',NOW())
     RETURNING *`,
    [vehicleId, dealershipId, suggestionType, provider || "rule_based", JSON.stringify(payload || {})]
  );
  return rows[0];
}

async function findSuggestion(vehicleId, dealershipId, suggestionId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM vehicle_commercial_suggestions
     WHERE id = $1 AND vehicle_id = $2 AND dealership_id = $3`,
    [suggestionId, vehicleId, dealershipId]
  );
  return rows[0] || null;
}

async function acceptSuggestion({ vehicleId, dealershipId, suggestion, userId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (suggestion.suggestion_type === "description") {
      await client.query(
        `UPDATE vehicles
         SET ad_description = $1,
             updated_at = NOW()
         WHERE id = $2 AND dealership_id = $3`,
        [suggestion.payload.suggestedDescription || "", vehicleId, dealershipId]
      );
    }
    if (suggestion.suggestion_type === "price") {
      await client.query(
        `UPDATE vehicles
         SET price = $1,
             price_strategy = $2,
             updated_at = NOW()
         WHERE id = $3 AND dealership_id = $4`,
        [
          suggestion.payload.suggestedPrice || null,
          suggestion.payload.strategy || null,
          vehicleId,
          dealershipId
        ]
      );
    }
    await client.query(
      `UPDATE vehicle_commercial_suggestions
       SET status = 'accepted',
           accepted_by = $1,
           accepted_at = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND dealership_id = $3`,
      [userId || null, suggestion.id, dealershipId]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function rejectSuggestion({ dealershipId, suggestionId, userId }) {
  const { rows } = await pool.query(
    `UPDATE vehicle_commercial_suggestions
     SET status = 'rejected',
         rejected_by = $1,
         rejected_at = NOW(),
         updated_at = NOW()
     WHERE id = $2 AND dealership_id = $3
     RETURNING *`,
    [userId || null, suggestionId, dealershipId]
  );
  return rows[0] || null;
}

async function createOverride({ vehicleId, dealershipId, reason, approvedBy, expiresAt, metadata }) {
  const { rows } = await pool.query(
    `INSERT INTO publication_overrides
      (vehicle_id, dealership_id, override_type, reason, approved_by, expires_at, metadata)
     VALUES ($1,$2,'ad_preparation',$3,$4,$5,$6::jsonb)
     RETURNING *`,
    [
      vehicleId,
      dealershipId,
      reason,
      approvedBy || null,
      expiresAt || null,
      JSON.stringify(metadata || {})
    ]
  );
  return rows[0];
}

async function publishVehicle({ vehicleId, dealershipId, userId, evaluation }) {
  const { rows } = await pool.query(
    `UPDATE vehicles
     SET ad_status = 'published',
         status = CASE WHEN status IN ('available', 'published') THEN 'published' ELSE status END,
         ad_preparation_status = 'ready',
         updated_at = NOW()
     WHERE id = $1 AND dealership_id = $2
     RETURNING *`,
    [vehicleId, dealershipId]
  );

  await pool.query(
    `INSERT INTO ads
      (dealership_id, vehicle_id, title, description, platform, status, metadata, updated_at)
     VALUES ($1,$2,$3,$4,'generic','published',$5::jsonb,NOW())`,
    [
      dealershipId,
      vehicleId,
      rows[0]?.title || `Veiculo #${vehicleId}`,
      rows[0]?.ad_description || rows[0]?.seo_description || null,
      JSON.stringify({
        published_by: userId || null,
        preparation_score: evaluation.score,
        preparation_grade: evaluation.grade
      })
    ]
  );
  return rows[0];
}

module.exports = {
  loadVehicleContext,
  saveEvaluation,
  getPreparation,
  saveSuggestion,
  findSuggestion,
  acceptSuggestion,
  rejectSuggestion,
  createOverride,
  publishVehicle
};
