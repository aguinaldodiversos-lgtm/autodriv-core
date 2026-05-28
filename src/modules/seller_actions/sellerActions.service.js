const pool = require("../../config/db");

const ACTION_STATUSES = new Set(["pending", "in_progress", "done", "dismissed"]);
const OUTCOME_TYPES = new Set([
  "sale",
  "reply",
  "proposal",
  "appointment",
  "visit_scheduled",
  "financing_simulation",
  "trade_in_evaluation",
  "lost",
  "no_result"
]);

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function dealershipId(user) {
  if (!user?.dealership_id) throw httpError("Loja nao associada ao usuario", 403);
  return user.dealership_id;
}

function clampLimit(value) {
  return Math.min(Math.max(parseInt(String(value), 10) || 50, 1), 200);
}

function buildFilters(filters, did, user) {
  const params = [did];
  const where = ["a.dealership_id = $1"];

  if (filters.status) {
    if (!ACTION_STATUSES.has(filters.status)) {
      throw httpError("status invalido", 400);
    }
    params.push(filters.status);
    where.push(`a.status = $${params.length}`);
  } else {
    where.push("a.status IN ('pending', 'in_progress')");
  }

  if (filters.priority) {
    params.push(filters.priority);
    where.push(`a.priority = $${params.length}`);
  }

  if (filters.source) {
    params.push(filters.source);
    where.push(`a.source = $${params.length}`);
  }

  if (filters.mine === "true") {
    params.push(user.id || 0);
    where.push(`COALESCE(a.claimed_by, a.assigned_seller_id) = $${params.length}`);
  }

  return { params, where };
}

async function listActions(user, filters = {}) {
  const did = dealershipId(user);
  const { params, where } = buildFilters(filters, did, user);
  const limit = clampLimit(filters.limit);
  const offset = Math.max(parseInt(String(filters.offset), 10) || 0, 0);
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT
       a.*,
       COALESCE(l.name, l.client_name) AS lead_name,
       COALESCE(l.whatsapp_phone, l.phone, l.client_phone) AS lead_phone,
       l.intent,
       l.intent_confidence,
       l.lead_score,
       l.status AS lead_status,
       l.ai_whatsapp_status,
       t.id AS inbox_thread_id,
       t.status AS inbox_status,
       t.channel AS inbox_channel,
       assignee.name AS assigned_seller_name,
       claimer.name AS claimed_by_name
     FROM seller_actions a
     LEFT JOIN leads l ON l.id = a.lead_id AND l.dealership_id = a.dealership_id
     LEFT JOIN inbox_threads t ON t.lead_id = a.lead_id
       AND t.dealership_id = a.dealership_id
       AND t.channel = 'whatsapp'
     LEFT JOIN users assignee ON assignee.id = a.assigned_seller_id
     LEFT JOIN users claimer ON claimer.id = a.claimed_by
     WHERE ${where.join(" AND ")}
     ORDER BY
       CASE a.priority
         WHEN 'urgent' THEN 0
         WHEN 'high' THEN 1
         WHEN 'medium' THEN 2
         ELSE 3
       END,
       a.due_at ASC NULLS LAST,
       a.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function getAction(user, actionId) {
  const rows = await listActions(user, { limit: 200, status: undefined });
  return rows.find((item) => Number(item.id) === Number(actionId)) || null;
}

async function claimAction(user, actionId) {
  const did = dealershipId(user);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE seller_actions
       SET claimed_by = $1,
           claimed_at = COALESCE(claimed_at, NOW()),
           assigned_seller_id = COALESCE(assigned_seller_id, $1),
           status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END,
           updated_at = NOW()
       WHERE id = $2
         AND dealership_id = $3
         AND status IN ('pending', 'in_progress')
       RETURNING *`,
      [user.id || null, actionId, did]
    );
    const action = rows[0];
    if (!action) throw httpError("Acao nao encontrada", 404);

    await client.query(
      `UPDATE leads
       SET assigned_user_id = COALESCE(assigned_user_id, $1),
           status = CASE WHEN status = 'human_required' THEN 'in_progress' ELSE status END,
           ai_whatsapp_status = 'human_active',
           updated_at = NOW()
       WHERE id = $2 AND dealership_id = $3`,
      [user.id || null, action.lead_id, did]
    );

    await client.query(
      `UPDATE inbox_threads
       SET claimed_by = COALESCE(claimed_by, $1),
           claimed_at = COALESCE(claimed_at, NOW()),
           assigned_user_id = COALESCE(assigned_user_id, $1),
           status = CASE WHEN status IN ('waiting_seller', 'open') THEN 'open' ELSE status END,
           metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
           updated_at = NOW()
       WHERE lead_id = $3 AND dealership_id = $4`,
      [
        user.id || null,
        JSON.stringify({ seller_action_claimed: { action_id: action.id, by: user.id || null } }),
        action.lead_id,
        did
      ]
    );
    await client.query("COMMIT");
    return action;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function completeAction(user, actionId, data = {}) {
  const did = dealershipId(user);
  const outcomeType = data.outcome_type || data.outcomeType || "no_result";
  if (!OUTCOME_TYPES.has(outcomeType)) {
    throw httpError("outcome_type invalido", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE seller_actions
       SET status = 'done',
           outcome_type = $1,
           outcome_value = $2,
           outcome_note = $3,
           completed_at = NOW(),
           claimed_by = COALESCE(claimed_by, $4),
           claimed_at = COALESCE(claimed_at, NOW()),
           metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb,
           updated_at = NOW()
       WHERE id = $6
         AND dealership_id = $7
         AND status IN ('pending', 'in_progress')
       RETURNING *`,
      [
        outcomeType,
        data.outcome_value ?? data.outcomeValue ?? null,
        data.note || data.outcome_note || null,
        user.id || null,
        JSON.stringify({
          completed_by: user.id || null,
          outcome_recorded_at: new Date().toISOString()
        }),
        actionId,
        did
      ]
    );
    const action = rows[0];
    if (!action) throw httpError("Acao nao encontrada", 404);

    const leadStatus =
      outcomeType === "sale" ? "converted" :
        outcomeType === "lost" ? "lost" :
          outcomeType === "appointment" || outcomeType === "visit_scheduled" ? "in_progress" :
            null;

    await client.query(
      `UPDATE leads
       SET status = COALESCE($1, status),
           ai_whatsapp_status = CASE
             WHEN $2 IN ('sale', 'lost') THEN 'human_closed'
             ELSE ai_whatsapp_status
           END,
           metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
           updated_at = NOW()
       WHERE id = $4 AND dealership_id = $5`,
      [
        leadStatus,
        outcomeType,
        JSON.stringify({ last_seller_action_outcome: { action_id: action.id, outcome_type: outcomeType } }),
        action.lead_id,
        did
      ]
    );

    await client.query("COMMIT");
    return action;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function dismissAction(user, actionId, data = {}) {
  const did = dealershipId(user);
  const { rows } = await pool.query(
    `UPDATE seller_actions
     SET status = 'dismissed',
         outcome_type = 'no_result',
         outcome_note = $1,
         updated_at = NOW()
     WHERE id = $2 AND dealership_id = $3
     RETURNING *`,
    [data.note || null, actionId, did]
  );
  if (!rows[0]) throw httpError("Acao nao encontrada", 404);
  return rows[0];
}

module.exports = {
  listActions,
  getAction,
  claimAction,
  completeAction,
  dismissAction
};
