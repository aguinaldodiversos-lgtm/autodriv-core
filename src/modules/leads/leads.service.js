const repo = require("./leads.repository");
const pool = require("../../config/db");
const convoRepo = require("../lead_conversations/leadConversations.repository");

/* =========================
   CRIAR LEAD
========================= */
async function createLead(data, user) {
  // validação mínima
  if (!data.vehicle_id && !data.client_phone) {
    throw new Error(
      "Informe vehicle_id ou pelo menos client_phone para criar o lead"
    );
  }

  const lead = await repo.create({
    dealership_id: user.dealership_id,
    client_id: data.client_id || null,
    vehicle_id: data.vehicle_id || null,
    assigned_user_id: data.assigned_user_id || user.id,
    source: data.source || "manual",
    status: data.status || "new",
    notes: data.notes || null,
    client_name: data.client_name || null,
    client_phone: data.client_phone || null,
    origin: data.origin || "manual"
  });

  // garante estado da IA
  await pool.query(
    `INSERT INTO lead_ai_state
     (dealership_id, lead_id, stage, followup_step, created_at, updated_at)
     VALUES ($1,$2,'new',0,NOW(),NOW())
     ON CONFLICT (lead_id) DO NOTHING`,
    [lead.dealership_id, lead.id]
  );

  return lead;
}

/* =========================
   LISTAR LEADS
========================= */
async function listLeads(user) {
  return repo.findAll(user.dealership_id);
}

/* =========================
   ATUALIZAR LEAD
========================= */
async function updateLead(id, data, user) {
  return repo.update(id, user.dealership_id, data);
}

/* =========================
   REMOVER LEAD
========================= */
async function deleteLead(id, user) {
  return repo.remove(id, user.dealership_id);
}

/* =========================
   REATIVAR LEAD
========================= */
async function reactivateLead(leadId, user) {
  const leadResult = await pool.query(
    `SELECT * FROM leads
     WHERE id = $1
     AND dealership_id = $2`,
    [leadId, user.dealership_id]
  );

  const lead = leadResult.rows[0];
  if (!lead) throw new Error("Lead não encontrado");

  // reinicia follow-up
  await pool.query(
    `UPDATE lead_ai_state
     SET followup_step = 0,
         stage = 'new',
         updated_at = NOW()
     WHERE lead_id = $1`,
    [leadId]
  );

  // mensagem inicial de reativação
  const message = `Olá! Tudo bem?
Vi que você tinha interesse em um carro.
Ainda está procurando algo para o dia a dia ou já resolveu por aí?`;

  await convoRepo.addMessage({
    dealership_id: lead.dealership_id,
    lead_id: leadId,
    role: "ai",
    message
  });

  return {
    success: true,
    message: "Lead reativado com sucesso"
  };
}

module.exports = {
  createLead,
  listLeads,
  updateLead,
  deleteLead,
  reactivateLead
};
