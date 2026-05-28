const pool = require("../../config/db");

const ACTIVE_LEAD_STATUSES = [
  "new",
  "qualifying",
  "waiting_customer",
  "human_required",
  "assigned",
  "in_progress",
  "reactivated"
];

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  return digits;
}

function defaultSettings(dealershipId) {
  return {
    dealership_id: dealershipId,
    ai_whatsapp_enabled: process.env.WHATSAPP_AI_ENABLED !== "false",
    ai_auto_reply_enabled: process.env.WHATSAPP_AI_AUTO_REPLY_ENABLED !== "false",
    ai_handoff_enabled: process.env.WHATSAPP_AI_HANDOFF_ENABLED !== "false",
    ai_max_auto_messages_per_lead: parseInt(process.env.WHATSAPP_AI_MAX_AUTO_MESSAGES || "5", 10),
    ai_business_hours_only: process.env.WHATSAPP_AI_BUSINESS_HOURS_ONLY === "true",
    ai_after_hours_message: process.env.WHATSAPP_AI_AFTER_HOURS_MESSAGE || null,
    ai_graceful_handoff_message:
      process.env.WHATSAPP_AI_HANDOFF_MESSAGE ||
      "Perfeito, vou encaminhar voce para um vendedor continuar o atendimento com mais precisao.",
    ai_default_seller_id: null,
    ai_escalation_threshold: parseInt(process.env.WHATSAPP_AI_ESCALATION_SCORE || "70", 10),
    ai_low_confidence_threshold: Number(process.env.WHATSAPP_AI_LOW_CONFIDENCE_THRESHOLD || 0.65),
    ai_unknown_retry_limit: parseInt(process.env.WHATSAPP_AI_UNKNOWN_RETRY_LIMIT || "1", 10),
    ai_allowed_intents: [],
    ai_blocked_keywords: [],
    ai_reply_delay_seconds: parseInt(process.env.WHATSAPP_AI_REPLY_DELAY_SECONDS || "0", 10)
  };
}

async function getSettings(dealershipId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM whatsapp_ai_settings
     WHERE dealership_id = $1`,
    [dealershipId]
  );
  return rows[0] || defaultSettings(dealershipId);
}

async function upsertSettings(dealershipId, data) {
  const current = defaultSettings(dealershipId);
  const values = {
    ai_whatsapp_enabled: data.ai_whatsapp_enabled ?? current.ai_whatsapp_enabled,
    ai_auto_reply_enabled: data.ai_auto_reply_enabled ?? current.ai_auto_reply_enabled,
    ai_handoff_enabled: data.ai_handoff_enabled ?? current.ai_handoff_enabled,
    ai_max_auto_messages_per_lead:
      data.ai_max_auto_messages_per_lead ?? current.ai_max_auto_messages_per_lead,
    ai_business_hours_only:
      data.ai_business_hours_only ?? current.ai_business_hours_only,
    ai_after_hours_message: data.ai_after_hours_message ?? current.ai_after_hours_message,
    ai_graceful_handoff_message:
      data.ai_graceful_handoff_message ?? current.ai_graceful_handoff_message,
    ai_default_seller_id: data.ai_default_seller_id ?? current.ai_default_seller_id,
    ai_escalation_threshold:
      data.ai_escalation_threshold ?? current.ai_escalation_threshold,
    ai_low_confidence_threshold:
      data.ai_low_confidence_threshold ?? current.ai_low_confidence_threshold,
    ai_unknown_retry_limit:
      data.ai_unknown_retry_limit ?? current.ai_unknown_retry_limit,
    ai_allowed_intents: data.ai_allowed_intents ?? current.ai_allowed_intents,
    ai_blocked_keywords: data.ai_blocked_keywords ?? current.ai_blocked_keywords,
    ai_reply_delay_seconds:
      data.ai_reply_delay_seconds ?? current.ai_reply_delay_seconds
  };

  const { rows } = await pool.query(
    `INSERT INTO whatsapp_ai_settings
      (dealership_id, ai_whatsapp_enabled, ai_auto_reply_enabled, ai_handoff_enabled,
       ai_max_auto_messages_per_lead, ai_business_hours_only, ai_after_hours_message,
       ai_graceful_handoff_message, ai_default_seller_id, ai_escalation_threshold,
       ai_low_confidence_threshold, ai_unknown_retry_limit, ai_allowed_intents,
       ai_blocked_keywords, ai_reply_delay_seconds)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15)
     ON CONFLICT (dealership_id)
     DO UPDATE SET
       ai_whatsapp_enabled = EXCLUDED.ai_whatsapp_enabled,
       ai_auto_reply_enabled = EXCLUDED.ai_auto_reply_enabled,
       ai_handoff_enabled = EXCLUDED.ai_handoff_enabled,
       ai_max_auto_messages_per_lead = EXCLUDED.ai_max_auto_messages_per_lead,
       ai_business_hours_only = EXCLUDED.ai_business_hours_only,
       ai_after_hours_message = EXCLUDED.ai_after_hours_message,
       ai_graceful_handoff_message = EXCLUDED.ai_graceful_handoff_message,
       ai_default_seller_id = EXCLUDED.ai_default_seller_id,
       ai_escalation_threshold = EXCLUDED.ai_escalation_threshold,
       ai_low_confidence_threshold = EXCLUDED.ai_low_confidence_threshold,
       ai_unknown_retry_limit = EXCLUDED.ai_unknown_retry_limit,
       ai_allowed_intents = EXCLUDED.ai_allowed_intents,
       ai_blocked_keywords = EXCLUDED.ai_blocked_keywords,
       ai_reply_delay_seconds = EXCLUDED.ai_reply_delay_seconds,
       updated_at = NOW()
     RETURNING *`,
    [
      dealershipId,
      values.ai_whatsapp_enabled,
      values.ai_auto_reply_enabled,
      values.ai_handoff_enabled,
      values.ai_max_auto_messages_per_lead,
      values.ai_business_hours_only,
      values.ai_after_hours_message,
      values.ai_graceful_handoff_message,
      values.ai_default_seller_id,
      values.ai_escalation_threshold,
      values.ai_low_confidence_threshold,
      values.ai_unknown_retry_limit,
      JSON.stringify(values.ai_allowed_intents || []),
      JSON.stringify(values.ai_blocked_keywords || []),
      values.ai_reply_delay_seconds
    ]
  );
  return rows[0];
}

async function findActiveLead(dealershipId, phone) {
  const statuses = ACTIVE_LEAD_STATUSES;
  const { rows } = await pool.query(
    `SELECT *
     FROM leads
     WHERE dealership_id = $1
       AND COALESCE(whatsapp_phone, phone, client_phone) = $2
       AND COALESCE(status, 'new') = ANY($3)
     ORDER BY last_message_at DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
     LIMIT 1`,
    [dealershipId, phone, statuses]
  );
  return rows[0] || null;
}

async function createLead({ dealershipId, phone, customerName, rawPayload }) {
  const { rows } = await pool.query(
    `INSERT INTO leads
      (dealership_id, name, phone, whatsapp_phone, client_phone, source, status,
       stage, ai_mode, first_message_at, last_message_at, metadata, created_at, updated_at)
     VALUES ($1,$2,$3,$3,$3,'whatsapp','new','first_contact','active',NOW(),NOW(),$4::jsonb,NOW(),NOW())
     RETURNING *`,
    [
      dealershipId,
      customerName || "Lead WhatsApp",
      phone,
      JSON.stringify({ whatsapp_ai: { created_from_inbound: true }, raw_hint: rawPayload?.source || null })
    ]
  );
  return rows[0];
}

async function findOrCreateLead({ dealershipId, phone, customerName, rawPayload }) {
  const existing = await findActiveLead(dealershipId, phone);
  if (existing) return { lead: existing, created: false };
  const lead = await createLead({ dealershipId, phone, customerName, rawPayload });
  return { lead, created: true };
}

async function upsertWhatsAppThread({ dealershipId, lead, phone }) {
  const externalThreadId = `whatsapp:${phone}`;
  const { rows } = await pool.query(
    `INSERT INTO inbox_threads
      (dealership_id, lead_id, channel, external_thread_id, subject,
       status, assigned_user_id, sla_due_at, last_message_at, unread_count, metadata)
     VALUES ($1,$2,'whatsapp',$3,$4,'open',$5,NOW() + INTERVAL '1 hour',NOW(),1,$6::jsonb)
     ON CONFLICT (dealership_id, channel, external_thread_id)
     WHERE external_thread_id IS NOT NULL
     DO UPDATE SET
       lead_id = EXCLUDED.lead_id,
       status = CASE
         WHEN inbox_threads.status = 'closed' THEN 'open'
         ELSE inbox_threads.status
       END,
       last_message_at = NOW(),
       unread_count = inbox_threads.unread_count + 1,
       updated_at = NOW()
     RETURNING *`,
    [
      dealershipId,
      lead.id,
      externalThreadId,
      lead.name || lead.client_name || "Lead WhatsApp",
      lead.assigned_user_id || null,
      JSON.stringify({ phone })
    ]
  );
  return rows[0];
}

async function saveConversationMessage({
  dealershipId,
  leadId,
  inboxThreadId,
  role,
  direction,
  channel = "whatsapp",
  externalMessageId,
  message,
  normalizedMessage,
  messageType = "text",
  aiProcessed = false,
  aiIntent,
  aiConfidence,
  metadata = {},
  rawPayload = {}
}) {
  const { rows } = await pool.query(
    `INSERT INTO lead_conversations
      (dealership_id, lead_id, inbox_thread_id, role, channel, direction,
       external_message_id, message, normalized_message, message_type, ai_processed,
       ai_intent, ai_confidence, metadata, raw_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb)
     ON CONFLICT (dealership_id, channel, external_message_id)
     WHERE external_message_id IS NOT NULL
     DO NOTHING
     RETURNING *`,
    [
      dealershipId,
      leadId,
      inboxThreadId || null,
      role,
      channel,
      direction,
      externalMessageId || null,
      message,
      normalizedMessage || null,
      messageType,
      aiProcessed,
      aiIntent || null,
      aiConfidence ?? null,
      JSON.stringify(metadata || {}),
      JSON.stringify(rawPayload || {})
    ]
  );

  if (!externalMessageId || rows[0]) {
    return { row: rows[0] || null, duplicate: false };
  }
  return { row: null, duplicate: true };
}

async function getRecentHistory(leadId, dealershipId, limit = 12) {
  const { rows } = await pool.query(
    `SELECT role, message, direction, created_at
     FROM lead_conversations
     WHERE lead_id = $1
       AND dealership_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [leadId, dealershipId, limit]
  );
  return rows.reverse();
}

async function updateLeadAfterAnalysis({
  leadId,
  dealershipId,
  classification,
  score,
  scoreReasons,
  message,
  nextStatus,
  aiStatus
}) {
  const metadata = {
    whatsapp_ai: {
      last_reason: classification.reason,
      score_reasons: scoreReasons,
      urgency: classification.urgency,
      last_message_excerpt: String(message || "").slice(0, 160)
    }
  };

  const { rows } = await pool.query(
    `UPDATE leads
     SET intent = $1,
         intent_confidence = $2,
         lead_score = GREATEST(COALESCE(lead_score, 0), $3),
         score = GREATEST(COALESCE(score, 0), $3),
         priority_score = GREATEST(COALESCE(priority_score, 0), $3),
         stage = $4,
         status = COALESCE($5, status),
         vehicle_interest_text = COALESCE($6, vehicle_interest_text),
         budget = COALESCE($7, budget),
         financing_interest = financing_interest OR $8,
         trade_in_interest = trade_in_interest OR $9,
         appraisal_interest = appraisal_interest OR $10,
         trade_vehicle_data = COALESCE(NULLIF($11::jsonb, '{}'::jsonb), trade_vehicle_data),
         preferred_contact_time = COALESCE($12, preferred_contact_time),
         metadata = COALESCE(metadata, '{}'::jsonb) || $13::jsonb,
         last_message_at = NOW(),
         last_contact_at = NOW(),
         last_ai_processed_at = NOW(),
         ai_whatsapp_status = COALESCE($14, ai_whatsapp_status),
         updated_at = NOW()
     WHERE id = $15
       AND dealership_id = $16
     RETURNING *`,
    [
      classification.intent,
      classification.confidence,
      score,
      classification.intent === "UNKNOWN" ? "first_contact" : "intent_detected",
      nextStatus || null,
      classification.entities.vehicle || null,
      classification.entities.budget || null,
      Boolean(classification.entities.financing_interest),
      classification.intent === "TRADE_IN",
      classification.intent === "APPRAISAL",
      JSON.stringify(classification.entities.trade_vehicle ? { text: classification.entities.trade_vehicle } : {}),
      classification.entities.preferred_time || null,
      JSON.stringify(metadata),
      aiStatus || null,
      leadId,
      dealershipId
    ]
  );
  return rows[0];
}

async function incrementAutoMessageCount(leadId, dealershipId) {
  const { rows } = await pool.query(
    `UPDATE leads
     SET ai_auto_message_count = COALESCE(ai_auto_message_count, 0) + 1,
         updated_at = NOW()
     WHERE id = $1 AND dealership_id = $2
     RETURNING *`,
    [leadId, dealershipId]
  );
  return rows[0];
}

async function markOptOut(leadId, dealershipId) {
  const { rows } = await pool.query(
    `UPDATE leads
     SET opted_out_at = NOW(),
         ai_whatsapp_status = 'opted_out',
         status = 'archived',
         updated_at = NOW()
     WHERE id = $1 AND dealership_id = $2
     RETURNING *`,
    [leadId, dealershipId]
  );
  return rows[0];
}

async function updateThreadStatus({ threadId, dealershipId, status, metadata = {}, unreadCount }) {
  await pool.query(
    `UPDATE inbox_threads
     SET status = $1,
         unread_count = COALESCE($2, unread_count),
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
         last_message_at = NOW(),
         updated_at = NOW()
     WHERE id = $4 AND dealership_id = $5`,
    [status, unreadCount ?? null, JSON.stringify(metadata), threadId, dealershipId]
  );
}

async function createSellerAction({
  dealershipId,
  leadId,
  assignedSellerId,
  type,
  priority,
  title,
  description,
  metadata
}) {
  const { rows } = await pool.query(
    `INSERT INTO seller_actions
      (dealership_id, lead_id, assigned_seller_id, type, priority,
       title, description, due_at, status, source, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW() + INTERVAL '15 minutes','pending','ai_whatsapp',$8::jsonb)
     RETURNING *`,
    [
      dealershipId,
      leadId,
      assignedSellerId || null,
      type,
      priority,
      title,
      description || null,
      JSON.stringify(metadata || {})
    ]
  );
  return rows[0];
}

async function logAiEvent({
  dealershipId,
  leadId,
  providerMessageId,
  eventType,
  classification,
  decision,
  status = "processed",
  errorMessage,
  metadata = {}
}) {
  await pool.query(
    `INSERT INTO whatsapp_ai_events
      (dealership_id, lead_id, provider_message_id, event_type, intent,
       confidence, decision, status, error_message, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
    [
      dealershipId,
      leadId || null,
      providerMessageId || null,
      eventType,
      classification?.intent || null,
      classification?.confidence ?? null,
      decision || null,
      status,
      errorMessage || null,
      JSON.stringify(metadata || {})
    ]
  );
}

module.exports = {
  normalizePhone,
  getSettings,
  upsertSettings,
  findOrCreateLead,
  upsertWhatsAppThread,
  saveConversationMessage,
  getRecentHistory,
  updateLeadAfterAnalysis,
  incrementAutoMessageCount,
  markOptOut,
  updateThreadStatus,
  createSellerAction,
  logAiEvent
};
