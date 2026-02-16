const repo = require("./leads.repository");

async function createLead(data, user) {
  return repo.create({
    dealership_id: user.dealershipId,
    client_id: data.client_id || null,
    vehicle_id: data.vehicle_id || null,
    assigned_user_id: data.assigned_user_id || user.userId,
    source: data.source,
    status: data.status || "new",
    notes: data.notes
  });
}

async function listLeads(user) {
  return repo.findAll(user.dealershipId);
}

async function updateLead(id, data, user) {
  return repo.update(id, user.dealershipId, data);
}

async function deleteLead(id, user) {
  return repo.remove(id, user.dealershipId);
}

module.exports = {
  createLead,
  listLeads,
  updateLead,
  deleteLead
};
