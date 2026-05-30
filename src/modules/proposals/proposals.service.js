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

function assertCanAcceptProposal(user) {
  const allowed = ["seller", "manager", "admin", "super_admin", "support"];
  if (!allowed.includes(user.role)) {
    const err = new Error("Voce nao tem permissao para aceitar proposta.");
    err.statusCode = 403;
    throw err;
  }
}

function normalizePositiveNumber(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    const err = new Error(`${fieldName} deve ser um numero positivo.`);
    err.statusCode = 400;
    throw err;
  }
  return number;
}

async function acceptProposal(id, data, user) {
  assertCanAcceptProposal(user);

  const proposalId = Number(id);
  if (!Number.isInteger(proposalId) || proposalId <= 0) {
    const err = new Error("ID da proposta invalido.");
    err.statusCode = 400;
    throw err;
  }

  return repo.acceptAndCreateContract(proposalId, user.dealership_id, {
    price: normalizePositiveNumber(data.price, "price"),
    payment_method: data.payment_method ? String(data.payment_method).trim() : null,
    notes: data.notes ? String(data.notes).trim() : null,
    accepted_by: user.id
  });
}

module.exports = {
  createProposal,
  listProposals,
  updateProposal,
  deleteProposal,
  acceptProposal
};
