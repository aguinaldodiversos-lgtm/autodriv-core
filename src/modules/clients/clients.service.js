const repo = require("./clients.repository");

async function createClient(data, user) {
  return repo.create({
    dealership_id: user.dealership_id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    cpf_cnpj: data.cpf_cnpj,
    notes: data.notes,
    birth_date: data.birth_date,
    preferred_contact_channel: data.preferred_contact_channel,
    tags: data.tags
  });
}

async function listClients(user) {
  return repo.findAll(user.dealership_id);
}

async function updateClient(id, data, user) {
  return repo.update(id, user.dealership_id, data);
}

async function deleteClient(id, user) {
  return repo.remove(id, user.dealership_id);
}

module.exports = {
  createClient,
  listClients,
  updateClient,
  deleteClient
};
