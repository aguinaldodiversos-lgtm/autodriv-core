const pool = require("../../config/db");

async function upsertActions(dealershipId, actions) {
  const persisted = [];

  for (const action of actions) {
    const result = await pool.query(
      `INSERT INTO intelligence_actions
       (dealership_id, action_key, type, entity_type, entity_id, priority_score,
        priority_label, reason, suggested_action, evidence, explanation, status,
        impact_area, impact_label, impact_estimate, urgency_label, expected_outcome,
        recommended_channel, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,'pending',$12,$13,$14,$15,$16,$17,NOW())
       ON CONFLICT (dealership_id, action_key)
       DO UPDATE SET
         type = EXCLUDED.type,
         entity_type = EXCLUDED.entity_type,
         entity_id = EXCLUDED.entity_id,
         priority_score = EXCLUDED.priority_score,
         priority_label = EXCLUDED.priority_label,
         reason = EXCLUDED.reason,
         suggested_action = EXCLUDED.suggested_action,
         evidence = EXCLUDED.evidence,
         explanation = EXCLUDED.explanation,
         impact_area = EXCLUDED.impact_area,
         impact_label = EXCLUDED.impact_label,
         impact_estimate = EXCLUDED.impact_estimate,
         urgency_label = EXCLUDED.urgency_label,
         expected_outcome = EXCLUDED.expected_outcome,
         recommended_channel = EXCLUDED.recommended_channel,
         updated_at = NOW()
       WHERE intelligence_actions.status = 'pending'
       RETURNING *`,
      [
        dealershipId,
        action.action_key,
        action.type,
        action.entity_type,
        action.entity_id,
        action.priority_score,
        action.priority_label,
        action.reason,
        action.suggested_action,
        JSON.stringify(action.evidence || {}),
        action.explanation || null,
        action.impact_area || null,
        action.impact_label || null,
        action.impact_estimate ?? null,
        action.urgency_label || null,
        action.expected_outcome || null,
        action.recommended_channel || null
      ]
    );

    if (result.rows[0]) {
      persisted.push(result.rows[0]);
    }
  }

  return persisted;
}

async function listPending(dealershipId, limit = 20) {
  const result = await pool.query(
    `SELECT *
     FROM intelligence_actions
     WHERE dealership_id = $1
       AND status = 'pending'
     ORDER BY priority_score DESC, updated_at DESC
     LIMIT $2`,
    [dealershipId, limit]
  );

  return result.rows;
}

async function updateFeedback(actionId, dealershipId, status, userId) {
  const result = await pool.query(
    `UPDATE intelligence_actions
     SET status = $1,
         decided_by = $2,
         decided_at = NOW(),
         updated_at = NOW()
     WHERE id = $3
       AND dealership_id = $4
     RETURNING *`,
    [status, userId, actionId, dealershipId]
  );

  return result.rows[0];
}

async function findActionById(actionId, dealershipId) {
  const result = await pool.query(
    `SELECT *
     FROM intelligence_actions
     WHERE id = $1
       AND dealership_id = $2`,
    [actionId, dealershipId]
  );

  return result.rows[0] || null;
}

async function upsertOutcome(actionId, dealershipId, userId, data) {
  const result = await pool.query(
    `INSERT INTO intelligence_action_outcomes
       (action_id, dealership_id, recorded_by, outcome_type, outcome_value,
        notes, occurred_at, metadata, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::timestamptz, NOW()),$8::jsonb,NOW())
     ON CONFLICT (action_id)
     DO UPDATE SET
       recorded_by = EXCLUDED.recorded_by,
       outcome_type = EXCLUDED.outcome_type,
       outcome_value = EXCLUDED.outcome_value,
       notes = EXCLUDED.notes,
       occurred_at = EXCLUDED.occurred_at,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     WHERE intelligence_action_outcomes.dealership_id = EXCLUDED.dealership_id
     RETURNING *`,
    [
      actionId,
      dealershipId,
      userId,
      data.outcome_type,
      data.outcome_value ?? null,
      data.notes || null,
      data.occurred_at || null,
      JSON.stringify(data.metadata || {})
    ]
  );

  return result.rows[0] || null;
}

async function getLearningMetrics(dealershipId, days = 90) {
  const params = [dealershipId, days];

  const summary = await pool.query(
    `SELECT
       COUNT(*)::int AS total_actions,
       COUNT(*) FILTER (WHERE a.status = 'pending')::int AS pending_actions,
       COUNT(*) FILTER (WHERE a.status = 'accepted')::int AS accepted_actions,
       COUNT(*) FILTER (WHERE a.status = 'ignored')::int AS ignored_actions,
       COUNT(o.id)::int AS outcomes_recorded,
       COUNT(o.id) FILTER (WHERE o.outcome_type <> 'no_result')::int AS positive_outcomes,
       COUNT(o.id) FILTER (WHERE o.outcome_type = 'sale')::int AS sales_generated,
       COALESCE(SUM(o.outcome_value), 0) AS outcome_value_total
     FROM intelligence_actions a
     LEFT JOIN intelligence_action_outcomes o
       ON o.action_id = a.id
      AND o.dealership_id = a.dealership_id
     WHERE a.dealership_id = $1
       AND a.created_at >= NOW() - ($2::int * INTERVAL '1 day')`,
    params
  );

  const byOutcomeType = await pool.query(
    `SELECT
       o.outcome_type,
       COUNT(*)::int AS total,
       COALESCE(SUM(o.outcome_value), 0) AS outcome_value_total
     FROM intelligence_action_outcomes o
     WHERE o.dealership_id = $1
       AND o.created_at >= NOW() - ($2::int * INTERVAL '1 day')
     GROUP BY o.outcome_type
     ORDER BY total DESC, outcome_value_total DESC`,
    params
  );

  const byActionType = await pool.query(
    `SELECT
       a.type,
       COUNT(*)::int AS total_actions,
       COUNT(*) FILTER (WHERE a.status = 'accepted')::int AS accepted_actions,
       COUNT(*) FILTER (WHERE a.status = 'ignored')::int AS ignored_actions,
       COUNT(o.id)::int AS outcomes_recorded,
       COUNT(o.id) FILTER (WHERE o.outcome_type <> 'no_result')::int AS positive_outcomes,
       COUNT(o.id) FILTER (WHERE o.outcome_type = 'sale')::int AS sales_generated,
       COUNT(o.id) FILTER (WHERE o.outcome_type = 'proposal')::int AS proposals_generated,
       COALESCE(SUM(o.outcome_value), 0) AS outcome_value_total,
       COALESCE(AVG(a.priority_score), 0) AS average_priority_score
     FROM intelligence_actions a
     LEFT JOIN intelligence_action_outcomes o
       ON o.action_id = a.id
      AND o.dealership_id = a.dealership_id
     WHERE a.dealership_id = $1
       AND a.created_at >= NOW() - ($2::int * INTERVAL '1 day')
     GROUP BY a.type
     ORDER BY outcome_value_total DESC, positive_outcomes DESC, accepted_actions DESC`,
    params
  );

  const bySeller = await pool.query(
    `SELECT
       u.id AS user_id,
       COALESCE(u.name, u.email, 'Sem responsavel') AS user_name,
       COUNT(o.id)::int AS outcomes_recorded,
       COUNT(o.id) FILTER (WHERE o.outcome_type <> 'no_result')::int AS positive_outcomes,
       COUNT(o.id) FILTER (WHERE o.outcome_type = 'sale')::int AS sales_generated,
       COUNT(o.id) FILTER (WHERE o.outcome_type = 'proposal')::int AS proposals_generated,
       COUNT(o.id) FILTER (WHERE o.outcome_type = 'appointment')::int AS appointments_generated,
       COALESCE(SUM(o.outcome_value), 0) AS outcome_value_total
     FROM intelligence_action_outcomes o
     LEFT JOIN users u
       ON u.id = o.recorded_by
      AND u.dealership_id = o.dealership_id
     WHERE o.dealership_id = $1
       AND o.created_at >= NOW() - ($2::int * INTERVAL '1 day')
     GROUP BY u.id, u.name, u.email
     ORDER BY outcome_value_total DESC, positive_outcomes DESC
     LIMIT 20`,
    params
  );

  const byImpactArea = await pool.query(
    `SELECT
       COALESCE(a.impact_area, 'operations') AS impact_area,
       COUNT(*)::int AS total_actions,
       COUNT(*) FILTER (WHERE a.status = 'accepted')::int AS accepted_actions,
       COUNT(o.id)::int AS outcomes_recorded,
       COUNT(o.id) FILTER (WHERE o.outcome_type <> 'no_result')::int AS positive_outcomes,
       COALESCE(SUM(o.outcome_value), 0) AS outcome_value_total,
       COALESCE(SUM(a.impact_estimate), 0) AS estimated_impact_total
     FROM intelligence_actions a
     LEFT JOIN intelligence_action_outcomes o
       ON o.action_id = a.id
      AND o.dealership_id = a.dealership_id
     WHERE a.dealership_id = $1
       AND a.created_at >= NOW() - ($2::int * INTERVAL '1 day')
     GROUP BY COALESCE(a.impact_area, 'operations')
     ORDER BY outcome_value_total DESC, positive_outcomes DESC, total_actions DESC`,
    params
  );

  return {
    summary: summary.rows[0] || {},
    by_outcome_type: byOutcomeType.rows,
    by_action_type: byActionType.rows,
    by_seller: bySeller.rows,
    by_impact_area: byImpactArea.rows
  };
}

module.exports = {
  upsertActions,
  listPending,
  updateFeedback,
  findActionById,
  upsertOutcome,
  getLearningMetrics
};
