const repo = require("./leads.repository");

function validateLeadData(data) {
  if (!data.client_id && !data.vehicle_id) {
    throw new Error(
      "Lead deve ter client_id ou vehicle_id"
    );
  }
}

async function createLead(data, user) {
  const dealershipId = user.dealership_id;

  if (!dealershipId) {
    throw new Error("Usuário sem dealership_id");
  }

  validateLeadData(data);

  return repo.create({
    dealership_id: dealershipId,
    client_id: data.client_id || null,
    vehicle_id: data.vehicle_id || null,
    assigned_user_id:
      data.assigned_user_id || user.id,
    source: data.source || "manual",
    status: data.status || "new",
    notes: data.notes || null
  });
}

async function listLeads(user) {
  const dealershipId = user.dealership_id;

  if (!dealershipId) {
    throw new Error("Usuário sem dealership_id");
  }

  return repo.findAll(dealershipId);
}

async function updateLead(id, data, user) {
  return repo.update(id, user.dealership_id, data);
}

async function deleteLead(id, user) {
  return repo.remove(id, user.dealership_id);
}

module.exports = {
  createLead,
  listLeads,
  updateLead,
  deleteLead
};
