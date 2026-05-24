const repo = require("./proposals.repository");

async function createProposal(data, user) {
  return repo.create({
    dealership_id: user.dealership_id,
    lead_id: data.lead_id || null,
    client_id: data.client_id,
    vehicle_id: data.vehicle_id,
    created_by: user.id,
    price: data.price,
    status: data.status || "open",
    notes: data.notes
  });
}

async function listProposals(user) {
  return repo.findAll(user.dealership_id);
}

async function updateProposal(id, data, user) {
  return repo.update(id, user.dealership_id, data);
}

async function deleteProposal(id, user) {
  return repo.remove(id, user.dealership_id);
}

module.exports = {
  createProposal,
  listProposals,
  updateProposal,
  deleteProposal
};
