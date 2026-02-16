const repo = require("./clients.repository");

async function createClient(data, user) {
  return repo.create({
    dealership_id: user.dealershipId,
    name: data.name,
    phone: data.phone,
    email: data.email,
    cpf_cnpj: data.cpf_cnpj,
    notes: data.notes
  });
}

async function listClients(user) {
  return repo.findAll(user.dealershipId);
}

async function updateClient(id, data, user) {
  return repo.update(id, user.dealershipId, data);
}

async function deleteClient(id, user) {
  return repo.remove(id, user.dealershipId);
}

module.exports = {
  createClient,
  listClients,
  updateClient,
  deleteClient
};
