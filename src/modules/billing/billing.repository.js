const pool = require("../../config/db");

async function withClient(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

async function listPlans() {
  const { rows } = await pool.query(
    `SELECT *
     FROM billing_plans
     ORDER BY id ASC`
  );
  return rows;
}

async function findPlanByCode(code) {
  const { rows } = await pool.query(
    `SELECT * FROM billing_plans WHERE code = $1`,
    [code]
  );
  return rows[0] || null;
}

async function createPlan(data) {
  const { rows } = await pool.query(
    `INSERT INTO billing_plans
     (code, name, description, amount, currency, interval_type, interval_count, active, mercado_pago_plan_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      data.code,
      data.name,
      data.description || null,
      data.amount,
      data.currency || "BRL",
      data.interval_type || "months",
      data.interval_count || 1,
      data.active !== false,
      data.mercado_pago_plan_id || null
    ]
  );
  return rows[0];
}

async function updatePlan(id, data) {
  const { rows } = await pool.query(
    `UPDATE billing_plans
     SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       amount = COALESCE($4, amount),
       currency = COALESCE($5, currency),
       interval_type = COALESCE($6, interval_type),
       interval_count = COALESCE($7, interval_count),
       active = COALESCE($8, active),
       mercado_pago_plan_id = COALESCE($9, mercado_pago_plan_id),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.name ?? null,
      data.description ?? null,
      data.amount ?? null,
      data.currency ?? null,
      data.interval_type ?? null,
      data.interval_count ?? null,
      data.active ?? null,
      data.mercado_pago_plan_id ?? null
    ]
  );
  return rows[0] || null;
}

async function createLocalSubscription(data) {
  const { rows } = await pool.query(
    `INSERT INTO account_subscriptions
     (dealership_id, user_id, plan_id, provider, external_reference, status, grace_until)
     VALUES ($1,$2,$3,'mercado_pago',$4,$5,$6)
     RETURNING *`,
    [
      data.dealership_id,
      data.user_id || null,
      data.plan_id,
      data.external_reference,
      data.status,
      data.grace_until || null
    ]
  );
  return rows[0];
}

async function updateSubscription(id, data) {
  const { rows } = await pool.query(
    `UPDATE account_subscriptions
     SET
       plan_id = COALESCE($2, plan_id),
       provider_subscription_id = COALESCE($3, provider_subscription_id),
       provider_payer_id = COALESCE($4, provider_payer_id),
       status = COALESCE($5, status),
       provider_status = COALESCE($6, provider_status),
       current_period_start = COALESCE($7, current_period_start),
       current_period_end = COALESCE($8, current_period_end),
       next_billing_date = COALESCE($9, next_billing_date),
       grace_until = COALESCE($10, grace_until),
       suspended_at = COALESCE($11, suspended_at),
       canceled_at = COALESCE($12, canceled_at),
       last_payment_status = COALESCE($13, last_payment_status),
       last_payment_id = COALESCE($14, last_payment_id),
       last_sync_at = COALESCE($15, last_sync_at),
       checkout_url = COALESCE($16, checkout_url),
       raw_provider_payload = COALESCE($17, raw_provider_payload),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.plan_id ?? null,
      data.provider_subscription_id ?? null,
      data.provider_payer_id ?? null,
      data.status ?? null,
      data.provider_status ?? null,
      data.current_period_start ?? null,
      data.current_period_end ?? null,
      data.next_billing_date ?? null,
      data.grace_until ?? null,
      data.suspended_at ?? null,
      data.canceled_at ?? null,
      data.last_payment_status ?? null,
      data.last_payment_id ?? null,
      data.last_sync_at ?? null,
      data.checkout_url ?? null,
      data.raw_provider_payload ? JSON.stringify(data.raw_provider_payload) : null
    ]
  );
  return rows[0] || null;
}

async function setManualOverride(id, data) {
  const { rows } = await pool.query(
    `UPDATE account_subscriptions
     SET status = $2,
         manual_override_reason = $3,
         manual_override_by = $4,
         manual_override_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, data.status, data.reason || null, data.user_id || null]
  );
  return rows[0] || null;
}

async function findSubscriptionById(id) {
  const { rows } = await pool.query(
    `SELECT s.*, p.code AS plan_code, p.name AS plan_name, p.amount, p.currency
     FROM account_subscriptions s
     LEFT JOIN billing_plans p ON p.id = s.plan_id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findLatestSubscriptionByDealership(dealershipId) {
  const { rows } = await pool.query(
    `SELECT s.*, p.code AS plan_code, p.name AS plan_name, p.amount, p.currency
     FROM account_subscriptions s
     LEFT JOIN billing_plans p ON p.id = s.plan_id
     WHERE s.dealership_id = $1
     ORDER BY s.id DESC
     LIMIT 1`,
    [dealershipId]
  );
  return rows[0] || null;
}

async function findSubscriptionByProviderId(providerSubscriptionId) {
  const { rows } = await pool.query(
    `SELECT * FROM account_subscriptions
     WHERE provider_subscription_id = $1
     LIMIT 1`,
    [providerSubscriptionId]
  );
  return rows[0] || null;
}

async function findSubscriptionByExternalReference(externalReference) {
  const { rows } = await pool.query(
    `SELECT * FROM account_subscriptions
     WHERE external_reference = $1
     LIMIT 1`,
    [externalReference]
  );
  return rows[0] || null;
}

async function listSubscriptions() {
  const { rows } = await pool.query(
    `SELECT s.*, p.code AS plan_code, p.name AS plan_name, d.name AS dealership_name
     FROM account_subscriptions s
     LEFT JOIN billing_plans p ON p.id = s.plan_id
     LEFT JOIN dealerships d ON d.id = s.dealership_id
     ORDER BY s.updated_at DESC, s.id DESC`
  );
  return rows;
}

async function getLegacySubscription(dealershipId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM subscriptions
     WHERE dealership_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [dealershipId]
  );
  return rows[0] || null;
}

async function listEntitlements(planId) {
  if (!planId) return [];
  const { rows } = await pool.query(
    `SELECT feature_key, limit_value, enabled
     FROM plan_entitlements
     WHERE plan_id = $1
     ORDER BY feature_key ASC`,
    [planId]
  );
  return rows;
}

async function insertEvent(data) {
  const { rows } = await pool.query(
    `INSERT INTO billing_events
     (provider, event_type, provider_event_id, provider_resource_id, action,
      x_request_id, signature_valid, raw_payload, processing_status, error_message)
     VALUES ('mercado_pago',$1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (provider_event_id) DO NOTHING
     RETURNING *`,
    [
      data.event_type || null,
      data.provider_event_id,
      data.provider_resource_id || null,
      data.action || null,
      data.x_request_id || null,
      data.signature_valid === true,
      JSON.stringify(data.raw_payload || {}),
      data.processing_status || "received",
      data.error_message || null
    ]
  );
  return rows[0] || null;
}

async function updateEventStatus(id, status, errorMessage) {
  await pool.query(
    `UPDATE billing_events
     SET processing_status = $2,
         processed_at = NOW(),
         error_message = $3
     WHERE id = $1`,
    [id, status, errorMessage || null]
  );
}

async function upsertPayment(subscriptionId, data) {
  const providerAuthorizedPaymentId = data.provider_authorized_payment_id || null;
  const providerPaymentId = data.provider_payment_id || null;
  const { rows } = await pool.query(
    `INSERT INTO billing_payments
     (subscription_id, provider_payment_id, provider_authorized_payment_id, status,
      status_detail, amount, currency, due_date, paid_at, failed_at, raw_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (provider_authorized_payment_id)
     DO UPDATE SET
       provider_payment_id = COALESCE(EXCLUDED.provider_payment_id, billing_payments.provider_payment_id),
       status = EXCLUDED.status,
       status_detail = EXCLUDED.status_detail,
       amount = EXCLUDED.amount,
       currency = EXCLUDED.currency,
       due_date = EXCLUDED.due_date,
       paid_at = EXCLUDED.paid_at,
       failed_at = EXCLUDED.failed_at,
       raw_payload = EXCLUDED.raw_payload,
       updated_at = NOW()
     RETURNING *`,
    [
      subscriptionId,
      providerPaymentId,
      providerAuthorizedPaymentId,
      data.status || null,
      data.status_detail || null,
      data.amount || null,
      data.currency || "BRL",
      data.due_date || null,
      data.paid_at || null,
      data.failed_at || null,
      JSON.stringify(data.raw_payload || {})
    ]
  );
  return rows[0];
}

module.exports = {
  withClient,
  listPlans,
  findPlanByCode,
  createPlan,
  updatePlan,
  createLocalSubscription,
  updateSubscription,
  setManualOverride,
  findSubscriptionById,
  findLatestSubscriptionByDealership,
  findSubscriptionByProviderId,
  findSubscriptionByExternalReference,
  listSubscriptions,
  getLegacySubscription,
  listEntitlements,
  insertEvent,
  updateEventStatus,
  upsertPayment
};
