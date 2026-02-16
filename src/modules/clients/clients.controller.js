const service = require("./clients.service");

async function create(req, res) {
  try {
    const client = await service.createClient(req.body, req.user);
    res.json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const clients = await service.listClients(req.user);
    res.json(clients);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const client = await service.updateClient(
      req.params.id,
      req.body,
      req.user
    );
    res.json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    await service.deleteClient(req.params.id, req.user);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  create,
  list,
  update,
  remove
};
