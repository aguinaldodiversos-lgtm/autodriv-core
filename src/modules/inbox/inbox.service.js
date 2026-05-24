const pool = require("../../config/db");
const whatsapp = require("../whatsapp/whatsapp.service");

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function dealershipId(user) {
  if (!user?.dealership_id) throw httpError("Loja nao associada ao usuario", 403);
  return user.dealership_id;
}

function clampLimit(limit) {
  return Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
}

async function ensureThreadForLead(user, leadId, channel = "manual") {
  const did = dealershipId(user);
  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1 AND dealership_id = $2`,
    [leadId, did]
  );
  const lead = leadResult.rows[0];
  if (!lead) throw httpError("Lead nao encontrado", 404);

  const { rows } = await pool.query(
    `INSERT INTO inbox_threads
      (dealership_id, lead_id, channel, external_thread_id, subject,
       status, assigned_user_id, sla_due_at, last_message_at, metadata)
     VALUES ($1,$2,$3,$4,$5,'open',$6,NOW() + INTERVAL '4 hours',NOW(),$7::jsonb)
     ON CONFLICT (dealership_id, channel, external_thread_id)
     WHERE external_thread_id IS NOT NULL
     DO UPDATE SET
       status = CASE WHEN inbox_threads.status = 'archived' THEN 'open' ELSE inbox_threads.status END,
       updated_at = NOW()
     RETURNING *`,
    [
      did,
      lead.id,
      channel,
      `lead:${lead.id}:${channel}`,
      lead.name || lead.client_name || `Lead #${lead.id}`,
      lead.assigned_user_id || null,
      JSON.stringify({ created_by: "ensureThreadForLead" })
    ]
  );
  return rows[0];
}

async function listConversations(user, filters = {}) {
  const did = dealershipId(user);
  const limit = clampLimit(filters.limit);
  const offset = Math.max(parseInt(String(filters.offset), 10) || 0, 0);
  const params = [did];
  const where = ["t.dealership_id = $1"];

  if (filters.status) {
    params.push(filters.status);
    where.push(`t.status = $${params.length}`);
  }
  if (filters.channel) {
    params.push(filters.channel);
    where.push(`t.channel = $${params.length}`);
  }
  if (filters.assigned_user_id) {
    params.push(filters.assigned_user_id);
    where.push(`t.assigned_user_id = $${params.length}`);
  }
  if (filters.sla === "overdue") {
    where.push("t.sla_due_at IS NOT NULL AND t.sla_due_at < NOW()");
  }

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT
       t.*,
       l.status AS lead_status,
       COALESCE(l.name, l.client_name) AS lead_name,
       COALESCE(l.phone, l.client_phone) AS lead_phone,
       l.email AS lead_email,
       l.score,
       l.priority_score,
       ps.name AS pipeline_stage_name,
       ps.key AS pipeline_stage_key,
       u.name AS assigned_user_name,
       claimer.name AS claimed_by_name,
       ls.name AS lead_source_name,
       ls.provider AS lead_source_provider,
       FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(t.last_message_at, t.created_at))) / 3600)::int AS hours_since_last_message
     FROM inbox_threads t
     LEFT JOIN leads l ON l.id = t.lead_id
     LEFT JOIN pipeline_stages ps ON ps.id = l.pipeline_stage_id
     LEFT JOIN users u ON u.id = t.assigned_user_id
     LEFT JOIN users claimer ON claimer.id = t.claimed_by
     LEFT JOIN lead_sources ls ON ls.id = t.lead_source_id
     WHERE ${where.join(" AND ")}
     ORDER BY
       CASE WHEN t.sla_due_at IS NOT NULL AND t.sla_due_at < NOW() THEN 0 ELSE 1 END,
       t.last_message_at DESC NULLS LAST,
       t.updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function getConversation(user, threadOrLeadId) {
  const did = dealershipId(user);
  const thread = await findThread(did, threadOrLeadId);
  if (!thread) throw httpError("Conversa nao encontrada", 404);

  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.role,
       COALESCE(c.direction, CASE WHEN c.role = 'client' THEN 'inbound' ELSE 'outbound' END) AS direction,
       COALESCE(c.channel, t.channel) AS channel,
       c.message,
       c.metadata,
       c.created_at,
       c.delivered_at,
       c.read_at
     FROM lead_conversations c
     LEFT JOIN inbox_threads t ON t.id = c.inbox_thread_id
     WHERE c.dealership_id = $1
       AND (
         c.inbox_thread_id = $2
         OR (c.inbox_thread_id IS NULL AND c.lead_id = $3)
       )
     ORDER BY c.created_at ASC
     LIMIT 1000`,
    [did, thread.id, thread.lead_id]
  );

  await pool.query(
    `UPDATE inbox_threads
     SET unread_count = 0, updated_at = NOW()
     WHERE id = $1 AND dealership_id = $2`,
    [thread.id, did]
  );

  return {
    thread,
    messages: rows
  };
}

async function findThread(did, id) {
  const { rows } = await pool.query(
    `SELECT *
     FROM inbox_threads
     WHERE dealership_id = $1
       AND (id = $2 OR lead_id = $2)
     ORDER BY id DESC
     LIMIT 1`,
    [did, id]
  );
  return rows[0];
}

async function claimThread(user, threadId) {
  const did = dealershipId(user);
  const { rows } = await pool.query(
    `UPDATE inbox_threads
     SET claimed_by = $1,
         claimed_at = NOW(),
         assigned_user_id = COALESCE(assigned_user_id, $1),
         status = CASE WHEN status IN ('closed', 'archived') THEN 'open' ELSE status END,
         updated_at = NOW()
     WHERE id = $2 AND dealership_id = $3
     RETURNING *`,
    [user.id || null, threadId, did]
  );
  if (!rows[0]) throw httpError("Conversa nao encontrada", 404);
  return rows[0];
}

async function updateThread(user, threadId, data) {
  const did = dealershipId(user);
  const { rows } = await pool.query(
    `UPDATE inbox_threads
     SET status = COALESCE($1, status),
         assigned_user_id = COALESCE($2, assigned_user_id),
         sla_due_at = COALESCE($3, sla_due_at),
         metadata = metadata || COALESCE($4::jsonb, '{}'::jsonb),
         updated_at = NOW()
     WHERE id = $5 AND dealership_id = $6
     RETURNING *`,
    [
      data.status ?? null,
      data.assigned_user_id ?? null,
      data.sla_due_at ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      threadId,
      did
    ]
  );
  if (!rows[0]) throw httpError("Conversa nao encontrada", 404);
  return rows[0];
}

async function sendHumanMessage(user, threadOrLeadId, message) {
  if (!message || !String(message).trim()) {
    throw httpError("message e obrigatorio", 400);
  }

  const did = dealershipId(user);
  let thread = await findThread(did, threadOrLeadId);
  if (!thread) {
    thread = await ensureThreadForLead(user, threadOrLeadId, "manual");
  }

  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1 AND dealership_id = $2`,
    [thread.lead_id, did]
  );
  const lead = leadResult.rows[0];
  if (!lead) throw httpError("Lead nao encontrado", 404);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO lead_conversations
       (dealership_id, lead_id, inbox_thread_id, role, channel, direction, message, metadata)
       VALUES ($1,$2,$3,'human',$4,'outbound',$5,$6::jsonb)
       RETURNING *`,
      [
        did,
        lead.id,
        thread.id,
        thread.channel,
        message,
        JSON.stringify({ sent_by: user.id || null })
      ]
    );
    const updatedThread = await client.query(
      `UPDATE inbox_threads
       SET status = 'waiting_customer',
           assigned_user_id = COALESCE(assigned_user_id, $1),
           claimed_by = COALESCE(claimed_by, $1),
           claimed_at = COALESCE(claimed_at, NOW()),
           last_message_at = NOW(),
           unread_count = 0,
           updated_at = NOW()
       WHERE id = $2 AND dealership_id = $3
       RETURNING *`,
      [user.id || null, thread.id, did]
    );
    await client.query(
      `UPDATE leads
       SET last_contact_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND dealership_id = $2`,
      [lead.id, did]
    );
    await client.query("COMMIT");

    if (thread.channel === "whatsapp") {
      await whatsapp.sendMessage(did, lead.phone || lead.client_phone, message);
    }

    return {
      thread: updatedThread.rows[0],
      message: inserted.rows[0]
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listTemplates(user, channel) {
  const params = [dealershipId(user)];
  let filter = "";
  if (channel) {
    params.push(channel);
    filter = `AND channel = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT *
     FROM message_templates
     WHERE dealership_id = $1
       AND is_active = true
       ${filter}
     ORDER BY category ASC NULLS LAST, name ASC`,
    params
  );
  return rows;
}

async function upsertTemplate(user, data) {
  const did = dealershipId(user);
  if (!data.name) throw httpError("name e obrigatorio", 400);
  if (!data.body) throw httpError("body e obrigatorio", 400);
  const { rows } = await pool.query(
    `INSERT INTO message_templates
      (dealership_id, name, channel, category, body, variables, is_active, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,COALESCE($7, true),NOW())
     ON CONFLICT (dealership_id, name)
     DO UPDATE SET
       channel = EXCLUDED.channel,
       category = EXCLUDED.category,
       body = EXCLUDED.body,
       variables = EXCLUDED.variables,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()
     RETURNING *`,
    [
      did,
      data.name,
      data.channel || "whatsapp",
      data.category || null,
      data.body,
      JSON.stringify(data.variables || []),
      data.is_active
    ]
  );
  return rows[0];
}

module.exports = {
  ensureThreadForLead,
  listConversations,
  getConversation,
  claimThread,
  updateThread,
  sendHumanMessage,
  listTemplates,
  upsertTemplate
};
