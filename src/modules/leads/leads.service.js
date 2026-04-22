const pool = require("../../config/db");
const repository = require("./leads.repository");
const followupService = require("../followups/followup.service");

/* =========================================
   CRIAR LEAD (MANUAL OU SISTEMA)
========================================= */
async function createLead(data, user, source = "manual") {
  const {
    name,
    phone,
    email,
    client_name,
    client_phone,
    client_id,
    vehicle_id,
    assigned_user_id,
    origin,
    notes
  } = data || {};

  const finalPhone = client_phone || phone;
  const finalName = client_name || name || "Lead Manual";

  if (!finalPhone) {
    throw new Error("Telefone é obrigatório");
  }

  // Evita duplicidade por telefone na mesma loja
  const existing = await pool.query(
    `SELECT *
     FROM leads
     WHERE dealership_id = $1
       AND client_phone = $2
     LIMIT 1`,
    [user.dealership_id, finalPhone]
  );

  if (existing.rows.length) {
    return existing.rows[0];
  }

  const lead = await repository.create({
    dealership_id: user.dealership_id,
    client_id: client_id || null,
    vehicle_id: vehicle_id || null,
    assigned_user_id: assigned_user_id || null,
    source,
    status: "new",
    notes: notes || null,
    client_name: finalName,
    client_phone: finalPhone,
    origin: origin || email || null
  });

  try {
    await followupService.scheduleLeadFollowups(lead, "manual");
  } catch (err) {
    console.error("Erro ao agendar follow-ups:", err);
  }

  return lead;
}

/* =========================================
   LISTAR LEADS DA LOJA (paginado)
========================================= */
async function listLeads(user, { limit = 50, offset = 0 } = {}) {
  const [items, total] = await Promise.all([
    repository.findAll(user.dealership_id, { limit, offset }),
    repository.countAll(user.dealership_id)
  ]);
  return { items, total, limit, offset };
}

/* =========================================
   BUSCAR LEAD POR ID (tenant-safe)
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
   ATUALIZAR LEAD (campos gerais)
========================================= */
async function updateLead(id, data, user) {
  const lead = await repository.update(id, user.dealership_id, data || {});

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  return lead;
}

/* =========================================
   ATUALIZAR APENAS STATUS
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
   REMOVER LEAD (tenant-safe)
========================================= */
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

  return { id: result.rows[0].id };
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

  await followupService.scheduleLeadFollowups(lead, "manual");

  return lead;
}

/* =========================================
   SCORE ATUAL DO LEAD (tenant-safe)
========================================= */
async function getLeadScore(id, user) {
  const result = await pool.query(
    `SELECT id, score, priority_score
     FROM leads
     WHERE id = $1
       AND dealership_id = $2`,
    [id, user.dealership_id]
  );

  if (!result.rows.length) {
    throw new Error("Lead não encontrado");
  }

  const row = result.rows[0];
  return {
    id: row.id,
    score: row.score ?? 0,
    priority_score: row.priority_score ?? 0
  };
}

module.exports = {
  createLead,
  listLeads,
  getLeads: listLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead,
  reactivateLead,
  getLeadScore
};
