const pool = require("../../config/db");

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function dealershipId(user) {
  if (!user?.dealership_id) throw httpError("Loja nao associada ao usuario", 403);
  return user.dealership_id;
}

function normalizeStageKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function ensureDefaultStages(did) {
  await pool.query(
    `INSERT INTO pipeline_stages
      (dealership_id, key, name, position, color, sla_hours, is_won, is_lost)
     VALUES
      ($1, 'new', 'Novo lead', 10, '#2563eb', 1, false, false),
      ($1, 'contacted', 'Contato iniciado', 20, '#0891b2', 4, false, false),
      ($1, 'qualifying', 'Qualificacao', 30, '#7c3aed', 12, false, false),
      ($1, 'proposal', 'Proposta', 40, '#ca8a04', 24, false, false),
      ($1, 'visit_scheduled', 'Visita agendada', 50, '#ea580c', 12, false, false),
      ($1, 'won', 'Ganho', 90, '#16a34a', NULL, true, false),
      ($1, 'lost', 'Perdido', 100, '#dc2626', NULL, false, true)
     ON CONFLICT (dealership_id, key) DO NOTHING`,
    [did]
  );
}

async function listStages(user) {
  const did = dealershipId(user);
  await ensureDefaultStages(did);
  const { rows } = await pool.query(
    `SELECT *
     FROM pipeline_stages
     WHERE dealership_id = $1
       AND is_active = true
     ORDER BY position ASC, id ASC`,
    [did]
  );
  return rows;
}

async function upsertStage(user, data) {
  const did = dealershipId(user);
  const key = normalizeStageKey(data.key || data.name);
  if (!key) throw httpError("key ou name e obrigatorio", 400);

  const { rows } = await pool.query(
    `INSERT INTO pipeline_stages
      (dealership_id, key, name, position, color, sla_hours, is_won, is_lost, is_active, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, false),COALESCE($8, false),COALESCE($9, true),NOW())
     ON CONFLICT (dealership_id, key)
     DO UPDATE SET
       name = EXCLUDED.name,
       position = EXCLUDED.position,
       color = EXCLUDED.color,
       sla_hours = EXCLUDED.sla_hours,
       is_won = COALESCE($7, pipeline_stages.is_won),
       is_lost = COALESCE($8, pipeline_stages.is_lost),
       is_active = EXCLUDED.is_active,
       updated_at = NOW()
     RETURNING *`,
    [
      did,
      key,
      data.name || key,
      Number.isFinite(Number(data.position)) ? Number(data.position) : 50,
      data.color || null,
      data.sla_hours ?? null,
      data.is_won ?? null,
      data.is_lost ?? null,
      data.is_active
    ]
  );
  return rows[0];
}

async function listCloseReasons(user, type) {
  const did = dealershipId(user);
  const params = [did];
  let filter = "";
  if (type) {
    params.push(type);
    filter = "AND type = $2";
  }
  const { rows } = await pool.query(
    `SELECT *
     FROM lead_close_reasons
     WHERE dealership_id = $1
       AND is_active = true
       ${filter}
     ORDER BY type ASC, name ASC`,
    params
  );
  return rows;
}

async function upsertCloseReason(user, data) {
  const did = dealershipId(user);
  if (!["won", "lost"].includes(data.type)) {
    throw httpError("type deve ser won ou lost", 400);
  }
  if (!data.name) throw httpError("name e obrigatorio", 400);

  const { rows } = await pool.query(
    `INSERT INTO lead_close_reasons (dealership_id, type, name, is_active)
     VALUES ($1,$2,$3,COALESCE($4, true))
     ON CONFLICT (dealership_id, type, name)
     DO UPDATE SET is_active = EXCLUDED.is_active
     RETURNING *`,
    [did, data.type, data.name, data.is_active]
  );
  return rows[0];
}

async function getPipeline(user) {
  const did = dealershipId(user);
  const stages = await listStages(user);
  const { rows } = await pool.query(
    `SELECT
       l.*,
       COALESCE(l.name, l.client_name) AS display_name,
       COALESCE(l.phone, l.client_phone) AS display_phone,
       ps.id AS stage_id,
       ps.key AS stage_key,
       ps.name AS stage_name,
       ps.position AS stage_position,
       ps.sla_hours,
       u.name AS assigned_user_name,
       ls.name AS lead_source_name,
       ls.provider AS lead_source_provider,
       MAX(c.created_at) AS last_message_at,
       COUNT(c.id)::int AS message_count,
       FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(l.last_stage_changed_at, l.updated_at, l.created_at))) / 3600)::int AS hours_in_stage
     FROM leads l
     LEFT JOIN pipeline_stages ps ON ps.id = l.pipeline_stage_id
     LEFT JOIN users u ON u.id = l.assigned_user_id
     LEFT JOIN lead_sources ls ON ls.id = l.lead_source_id
     LEFT JOIN lead_conversations c
       ON c.lead_id = l.id
      AND c.dealership_id = l.dealership_id
     WHERE l.dealership_id = $1
       AND l.closed_at IS NULL
     GROUP BY l.id, ps.id, u.name, ls.name, ls.provider
     ORDER BY ps.position ASC NULLS FIRST, l.sla_due_at ASC NULLS LAST, l.updated_at DESC`,
    [did]
  );

  const columns = stages.map((stage) => ({
    ...stage,
    leads: []
  }));
  const byId = new Map(columns.map((stage) => [stage.id, stage]));
  const fallback = columns.find((stage) => stage.key === "new") || columns[0];

  for (const lead of rows) {
    const column = byId.get(lead.stage_id) || fallback;
    if (column) column.leads.push(lead);
  }

  return {
    generated_at: new Date().toISOString(),
    stages: columns,
    totals: {
      open_leads: rows.length,
      overdue_sla: rows.filter((lead) => lead.sla_due_at && new Date(lead.sla_due_at) < new Date()).length
    }
  };
}

async function findStage(did, input) {
  if (input.stage_id) {
    const { rows } = await pool.query(
      `SELECT * FROM pipeline_stages WHERE id = $1 AND dealership_id = $2 AND is_active = true`,
      [input.stage_id, did]
    );
    return rows[0];
  }

  const key = normalizeStageKey(input.stage || input.stage_key);
  if (!key) throw httpError("stage_id ou stage_key e obrigatorio", 400);
  const { rows } = await pool.query(
    `SELECT * FROM pipeline_stages WHERE dealership_id = $1 AND key = $2 AND is_active = true`,
    [did, key]
  );
  return rows[0];
}

async function moveLead(user, leadId, data) {
  const did = dealershipId(user);
  const target = await findStage(did, data);
  if (!target) throw httpError("Etapa nao encontrada", 404);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const leadResult = await client.query(
      `SELECT l.*, ps.key AS current_stage_key
       FROM leads l
       LEFT JOIN pipeline_stages ps ON ps.id = l.pipeline_stage_id
       WHERE l.id = $1 AND l.dealership_id = $2
       FOR UPDATE`,
      [leadId, did]
    );
    const lead = leadResult.rows[0];
    if (!lead) throw httpError("Lead nao encontrado", 404);

    let reasonId = data.close_reason_id || null;
    let closedAt = null;
    let status = lead.status;

    if (target.is_won || target.is_lost) {
      closedAt = new Date();
      status = target.is_won ? "won" : "lost";
      if (reasonId) {
        const reason = await client.query(
          `SELECT id FROM lead_close_reasons
           WHERE id = $1 AND dealership_id = $2 AND type = $3`,
          [reasonId, did, status]
        );
        if (!reason.rows.length) throw httpError("Motivo de fechamento invalido", 400);
      }
    }

    const slaDueAt = target.sla_hours
      ? new Date(Date.now() + Number(target.sla_hours) * 60 * 60 * 1000)
      : null;

    const updated = await client.query(
      `UPDATE leads
       SET pipeline_stage_id = $1,
           status = $2,
           close_reason_id = $3,
           close_reason_note = COALESCE($4, close_reason_note),
           closed_at = $5,
           next_action_at = $6,
           sla_due_at = $7,
           last_stage_changed_at = NOW(),
           updated_at = NOW()
       WHERE id = $8 AND dealership_id = $9
       RETURNING *`,
      [
        target.id,
        status,
        reasonId,
        data.close_reason_note || null,
        closedAt,
        data.next_action_at || null,
        slaDueAt,
        leadId,
        did
      ]
    );

    await client.query(
      `INSERT INTO pipeline_activities
       (dealership_id, lead_id, from_stage_id, to_stage_id, type, title,
        description, next_action_at, created_by, metadata)
       VALUES ($1,$2,$3,$4,'stage_changed',$5,$6,$7,$8,$9::jsonb)`,
      [
        did,
        leadId,
        lead.pipeline_stage_id || null,
        target.id,
        `Movido para ${target.name}`,
        data.note || null,
        data.next_action_at || null,
        user.id || null,
        JSON.stringify({
          close_reason_id: reasonId,
          close_reason_note: data.close_reason_note || null
        })
      ]
    );

    await client.query("COMMIT");
    return updated.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function addActivity(user, leadId, data) {
  const did = dealershipId(user);
  const leadCheck = await pool.query(
    `SELECT id FROM leads WHERE id = $1 AND dealership_id = $2`,
    [leadId, did]
  );
  if (!leadCheck.rows.length) throw httpError("Lead nao encontrado", 404);

  const { rows } = await pool.query(
    `INSERT INTO pipeline_activities
     (dealership_id, lead_id, type, title, description, next_action_at, created_by, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
     RETURNING *`,
    [
      did,
      leadId,
      data.type || "note",
      data.title || null,
      data.description || null,
      data.next_action_at || null,
      user.id || null,
      JSON.stringify(data.metadata || {})
    ]
  );

  if (data.next_action_at) {
    await pool.query(
      `UPDATE leads
       SET next_action_at = $1, updated_at = NOW()
       WHERE id = $2 AND dealership_id = $3`,
      [data.next_action_at, leadId, did]
    );
  }

  return rows[0];
}

async function listActivities(user, leadId) {
  const did = dealershipId(user);
  const { rows } = await pool.query(
    `SELECT pa.*, fs.name AS from_stage_name, ts.name AS to_stage_name, u.name AS created_by_name
     FROM pipeline_activities pa
     LEFT JOIN pipeline_stages fs ON fs.id = pa.from_stage_id
     LEFT JOIN pipeline_stages ts ON ts.id = pa.to_stage_id
     LEFT JOIN users u ON u.id = pa.created_by
     WHERE pa.dealership_id = $1
       AND pa.lead_id = $2
     ORDER BY pa.created_at DESC
     LIMIT 200`,
    [did, leadId]
  );
  return rows;
}

module.exports = {
  listStages,
  upsertStage,
  listCloseReasons,
  upsertCloseReason,
  getPipeline,
  moveLead,
  addActivity,
  listActivities
};
