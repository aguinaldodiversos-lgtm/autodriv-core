const pool = require("../../config/db");
const followupService = require("../followups/followup.service");

/* =========================================
   CRIAR LEAD (MANUAL OU SISTEMA)
========================================= */
async function createLead(data, user, source = "manual") {
  const {
    name,
    phone,
    email,
    vehicle_id,
    notes
  } = data;

  if (!phone) {
    throw new Error("Telefone é obrigatório");
  }

  // evita duplicidade por telefone na mesma loja
  const existing = await pool.query(
    `SELECT * FROM leads
     WHERE dealership_id = $1
     AND phone = $2`,
    [user.dealership_id, phone]
  );

  if (existing.rows.length) {
    return existing.rows[0];
  }

  const result = await pool.query(
    `INSERT INTO leads
     (dealership_id, name, phone, email, vehicle_id, notes, status, source, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,'new',$7,NOW())
     RETURNING *`,
    [
      user.dealership_id,
      name || "Lead Manual",
      phone,
      email || null,
      vehicle_id || null,
      notes || null,
      source
    ]
  );

  const lead = result.rows[0];

  /* =========================================
     AGENDAR FOLLOWUPS AUTOMÁTICOS
     Manual começa do Dia 3
  ========================================= */
  try {
    await followupService.scheduleLeadFollowups(lead, "manual");
  } catch (err) {
    console.error("Erro ao agendar follow-ups:", err);
  }

  return lead;
}

/* =========================================
   BUSCAR LEADS DA LOJA
========================================= */
async function getLeads(user, pagination = {}) {
  const limit = pagination.limit ?? 50;
  const offset = pagination.offset ?? 0;
  const result = await pool.query(
    `SELECT *
     FROM leads
     WHERE dealership_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [user.dealership_id, limit, offset]
  );

  return result.rows;
}

/* =========================================
   BUSCAR LEAD POR ID
========================================= */
async function getLeadById(id, user) {
  const result = await pool.query(
    `SELECT *
     FROM leads
     WHERE id = $1
     AND dealership_id = $2`,
    [id, user.dealership_id]
  );

  if (!result.rows.length) {
    throw new Error("Lead não encontrado");
  }

  return result.rows[0];
}

/* =========================================
   ATUALIZAR STATUS DO LEAD
========================================= */
async function updateLeadStatus(id, status, user) {
  const result = await pool.query(
    `UPDATE leads
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2
     AND dealership_id = $3
     RETURNING *`,
    [status, id, user.dealership_id]
  );

  if (!result.rows.length) {
    throw new Error("Lead não encontrado");
  }

  return result.rows[0];
}

/* =========================================
   REATIVAR LEAD ANTIGO
========================================= */
async function reactivateLead(id, user) {
  const result = await pool.query(
    `UPDATE leads
     SET status = 'reactivated',
         updated_at = NOW()
     WHERE id = $1
     AND dealership_id = $2
     RETURNING *`,
    [id, user.dealership_id]
  );

  if (!result.rows.length) {
    throw new Error("Lead não encontrado");
  }

  const lead = result.rows[0];

  // agenda follow-ups começando do Dia 3
  await followupService.scheduleLeadFollowups(lead, "manual");

  return lead;
}

const ALLOWED_LEAD_UPDATE = new Set([
  "name",
  "phone",
  "email",
  "vehicle_id",
  "notes",
  "status",
  "source",
  "assigned_user_id",
  "score"
]);

async function updateLead(id, body, user) {
  const entries = Object.entries(body || {}).filter(
    ([k, v]) => ALLOWED_LEAD_UPDATE.has(k) && v !== undefined
  );
  if (!entries.length) {
    return getLeadById(id, user);
  }

  const sets = [];
  const vals = [];
  let i = 1;
  for (const [col, val] of entries) {
    sets.push(`${col} = $${i++}`);
    vals.push(val);
  }
  const idParam = i;
  const dealParam = i + 1;
  vals.push(id, user.dealership_id);

  const result = await pool.query(
    `UPDATE leads
     SET ${sets.join(", ")},
         updated_at = NOW()
     WHERE id = $${idParam}
     AND dealership_id = $${dealParam}
     RETURNING *`,
    vals
  );

  if (!result.rows.length) {
    throw new Error("Lead não encontrado");
  }

  return result.rows[0];
}

async function deleteLead(id, user) {
  const result = await pool.query(
    `DELETE FROM leads
     WHERE id = $1
     AND dealership_id = $2
     RETURNING id`,
    [id, user.dealership_id]
  );

  if (!result.rows.length) {
    throw new Error("Lead não encontrado");
  }
}

module.exports = {
  createLead,
  getLeads,
  listLeads: getLeads,
  getLeadById,
  updateLeadStatus,
  updateLead,
  deleteLead,
  reactivateLead
};
