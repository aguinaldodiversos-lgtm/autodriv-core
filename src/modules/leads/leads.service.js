const repo = require("./leads.repository");

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

  return repo.create({
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

module.exports = {
  createLead,
  listLeads,
  updateLead,
  deleteLead
};
