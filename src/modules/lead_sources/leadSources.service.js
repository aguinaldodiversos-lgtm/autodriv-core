const crypto = require("crypto");
const pool = require("../../config/db");
const followupService = require("../followups/followup.service");

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function dealershipId(user) {
  if (!user?.dealership_id) throw httpError("Loja nao associada ao usuario", 403);
  return user.dealership_id;
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function pick(payload, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, part) => {
      if (acc == null) return undefined;
      return acc[part];
    }, payload);
    if (value != null && String(value).trim() !== "") return value;
  }
  return null;
}

function normalizeIncomingLead(payload = {}, provider = "generic") {
  const fields = Array.isArray(payload.field_data)
    ? Object.fromEntries(
        payload.field_data.map((item) => [item.name, Array.isArray(item.values) ? item.values[0] : item.value])
      )
    : {};

  const sourcePayload = {
    ...payload,
    ...fields,
    lead: payload.lead || {},
    contact: payload.contact || {}
  };

  const phone = cleanPhone(
    pick(sourcePayload, [
      "phone",
      "telefone",
      "whatsapp",
      "mobile",
      "contact.phone",
      "lead.phone",
      "lead.telefone"
    ])
  );

  return {
    external_id:
      pick(sourcePayload, ["id", "lead_id", "external_id", "submission_id", "responseId"]) ||
      crypto.createHash("sha1").update(JSON.stringify(payload)).digest("hex"),
    name:
      pick(sourcePayload, ["name", "nome", "full_name", "contact.name", "lead.name"]) ||
      "Lead recebido",
    phone,
    email: pick(sourcePayload, ["email", "contact.email", "lead.email"]),
    vehicle_id: pick(sourcePayload, ["vehicle_id", "vehicle.id", "car_id"]) || null,
    notes:
      pick(sourcePayload, ["message", "mensagem", "notes", "observacao", "comentario"]) ||
      `Lead recebido via ${provider}`,
    desired_vehicle:
      pick(sourcePayload, ["vehicle", "veiculo", "modelo", "car", "ad_name"]) || null,
    raw: payload
  };
}

async function listSources(user) {
  const { rows } = await pool.query(
    `SELECT id, key, name, provider, channel, status, config,
            last_ingested_at, created_at, updated_at
     FROM lead_sources
     WHERE dealership_id = $1
     ORDER BY status ASC, name ASC`,
    [dealershipId(user)]
  );
  return rows;
}

async function createSource(user, data) {
  const did = dealershipId(user);
  const key = normalizeKey(data.key || data.name || data.provider);
  if (!key) throw httpError("key ou name e obrigatorio", 400);
  if (!data.name) throw httpError("name e obrigatorio", 400);
  if (!data.provider) throw httpError("provider e obrigatorio", 400);

  const { rows } = await pool.query(
    `INSERT INTO lead_sources
      (dealership_id, key, name, provider, channel, status, auth_token, config)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,'active'),$7,$8::jsonb)
     ON CONFLICT (dealership_id, key)
     DO UPDATE SET
       name = EXCLUDED.name,
       provider = EXCLUDED.provider,
       channel = EXCLUDED.channel,
       status = EXCLUDED.status,
       config = EXCLUDED.config,
       updated_at = NOW()
     RETURNING id, key, name, provider, channel, status, auth_token, config, created_at, updated_at`,
    [
      did,
      key,
      data.name,
      data.provider,
      data.channel || "portal",
      data.status || "active",
      data.auth_token || randomToken(),
      JSON.stringify(data.config || {})
    ]
  );
  return rows[0];
}

async function updateSource(user, id, data) {
  const did = dealershipId(user);
  const { rows } = await pool.query(
    `UPDATE lead_sources
     SET name = COALESCE($1, name),
         provider = COALESCE($2, provider),
         channel = COALESCE($3, channel),
         status = COALESCE($4, status),
         config = COALESCE($5::jsonb, config),
         updated_at = NOW()
     WHERE id = $6 AND dealership_id = $7
     RETURNING id, key, name, provider, channel, status, config, created_at, updated_at`,
    [
      data.name ?? null,
      data.provider ?? null,
      data.channel ?? null,
      data.status ?? null,
      data.config ? JSON.stringify(data.config) : null,
      id,
      did
    ]
  );
  if (!rows[0]) throw httpError("Fonte nao encontrada", 404);
  return rows[0];
}

async function findSourceForWebhook(sourceKey, token) {
  const { rows } = await pool.query(
    `SELECT *
     FROM lead_sources
     WHERE key = $1
       AND status = 'active'
     ORDER BY id ASC
     LIMIT 1`,
    [normalizeKey(sourceKey)]
  );
  const source = rows[0];
  if (!source) throw httpError("Fonte de lead nao encontrada", 404);
  if (source.auth_token && source.auth_token !== token) {
    throw httpError("Token da fonte invalido", 401);
  }
  return source;
}

async function getDefaultStageId(client, dealershipId) {
  const { rows } = await client.query(
    `SELECT id FROM pipeline_stages
     WHERE dealership_id = $1 AND key = 'new'
     LIMIT 1`,
    [dealershipId]
  );
  return rows[0]?.id || null;
}

async function ensureInboxThread(client, { dealershipId, source, lead, externalId, normalized }) {
  const channel = source.channel || "portal";
  const externalThreadId = `${source.provider}:${externalId}`;
  const { rows } = await client.query(
    `INSERT INTO inbox_threads
      (dealership_id, lead_id, lead_source_id, channel, external_thread_id,
       subject, status, sla_due_at, last_message_at, unread_count, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,'open',NOW() + INTERVAL '1 hour',NOW(),1,$7::jsonb)
     ON CONFLICT (dealership_id, channel, external_thread_id)
     WHERE external_thread_id IS NOT NULL
     DO UPDATE SET
       lead_id = EXCLUDED.lead_id,
       lead_source_id = EXCLUDED.lead_source_id,
       status = 'open',
       last_message_at = NOW(),
       unread_count = inbox_threads.unread_count + 1,
       updated_at = NOW()
     RETURNING *`,
    [
      dealershipId,
      lead.id,
      source.id,
      channel,
      externalThreadId,
      normalized.desired_vehicle || normalized.name,
      JSON.stringify({ provider: source.provider, external_id: externalId })
    ]
  );
  return rows[0];
}

async function ingestWebhook(sourceKey, token, payload) {
  const source = await findSourceForWebhook(sourceKey, token);
  const normalized = normalizeIncomingLead(payload, source.provider);
  if (!normalized.phone && !normalized.email) {
    throw httpError("Lead sem telefone ou email", 400);
  }

  const dedupeKey = `${source.provider}:${normalized.external_id || normalized.phone || normalized.email}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const eventResult = await client.query(
      `INSERT INTO lead_ingestion_events
        (dealership_id, lead_source_id, provider, external_id, dedupe_key, payload)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (dealership_id, dedupe_key)
       DO UPDATE SET
         status = 'duplicate',
         updated_at = NOW()
       RETURNING *`,
      [
        source.dealership_id,
        source.id,
        source.provider,
        normalized.external_id,
        dedupeKey,
        JSON.stringify(payload || {})
      ]
    );
    const event = eventResult.rows[0];

    if (event.status === "duplicate" && event.lead_id) {
      await client.query("COMMIT");
      return {
        status: "duplicate",
        lead: { id: event.lead_id },
        inbox_thread: null
      };
    }

    const existing = await client.query(
      `SELECT *
       FROM leads
       WHERE dealership_id = $1
         AND (
           ($2 <> '' AND phone = $2)
           OR ($3 IS NOT NULL AND email = $3)
         )
       ORDER BY updated_at DESC
       LIMIT 1`,
      [source.dealership_id, normalized.phone || "", normalized.email || null]
    );

    const stageId = await getDefaultStageId(client, source.dealership_id);
    let lead = existing.rows[0];

    if (lead) {
      const updated = await client.query(
        `UPDATE leads
         SET lead_source_id = COALESCE(lead_source_id, $1),
             notes = COALESCE(NULLIF(notes, ''), $2),
             last_contact_at = NOW(),
             sla_due_at = COALESCE(sla_due_at, NOW() + INTERVAL '1 hour'),
             updated_at = NOW()
         WHERE id = $3 AND dealership_id = $4
         RETURNING *`,
        [source.id, normalized.notes, lead.id, source.dealership_id]
      );
      lead = updated.rows[0];
    } else {
      const inserted = await client.query(
        `INSERT INTO leads
          (dealership_id, lead_source_id, pipeline_stage_id, name, phone, email,
           vehicle_id, notes, status, source, origin, last_contact_at, sla_due_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new',$9,$10,NOW(),NOW() + INTERVAL '1 hour',NOW())
         RETURNING *`,
        [
          source.dealership_id,
          source.id,
          stageId,
          normalized.name,
          normalized.phone || null,
          normalized.email || null,
          normalized.vehicle_id,
          normalized.notes,
          source.provider,
          source.channel
        ]
      );
      lead = inserted.rows[0];
    }

    const thread = await ensureInboxThread(client, {
      dealershipId: source.dealership_id,
      source,
      lead,
      externalId: normalized.external_id,
      normalized
    });

    await client.query(
      `INSERT INTO lead_conversations
        (dealership_id, lead_id, inbox_thread_id, role, channel, direction,
         external_message_id, message, metadata)
       VALUES ($1,$2,$3,'client',$4,'inbound',$5,$6,$7::jsonb)`,
      [
        source.dealership_id,
        lead.id,
        thread.id,
        source.channel,
        normalized.external_id,
        normalized.notes || "Novo lead recebido",
        JSON.stringify({
          desired_vehicle: normalized.desired_vehicle,
          provider: source.provider
        })
      ]
    );

    await client.query(
      `UPDATE lead_ingestion_events
       SET status = 'processed', lead_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [lead.id, event.id]
    );
    await client.query(
      `UPDATE lead_sources
       SET last_ingested_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [source.id]
    );

    await client.query("COMMIT");

    try {
      await followupService.scheduleLeadFollowups(lead, "full");
    } catch (err) {
      console.error("Erro ao agendar follow-ups de webhook:", err);
    }

    return {
      status: "processed",
      lead,
      inbox_thread: thread
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listSources,
  createSource,
  updateSource,
  ingestWebhook,
  normalizeIncomingLead
};
