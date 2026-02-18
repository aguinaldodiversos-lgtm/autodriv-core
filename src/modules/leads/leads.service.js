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
async function getLeads(user) {
  const result = await pool.query(
    `SELECT *
     FROM leads
     WHERE dealership_id = $1
     ORDER BY created_at DESC`,
    [user.dealership_id]
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

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  reactivateLead
};
