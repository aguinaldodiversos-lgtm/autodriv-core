const repo = require("./proposals.repository");

async function createProposal(data, user) {
  return repo.create({
    dealership_id: user.dealershipId,
    lead_id: data.lead_id || null,
    client_id: data.client_id,
    vehicle_id: data.vehicle_id,
    created_by: user.userId,
    price: data.price,
    status: data.status || "open",
    notes: data.notes
  });
}

async function listProposals(user) {
  return repo.findAll(user.dealershipId);
}

async function updateProposal(id, data, user) {
  return repo.update(id, user.dealershipId, data);
}

async function deleteProposal(id, user) {
  return repo.remove(id, user.dealershipId);
}

module.exports = {
  createProposal,
  listProposals,
  updateProposal,
  deleteProposal
};
