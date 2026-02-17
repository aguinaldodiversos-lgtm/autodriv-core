const service = require("./leads.service");

async function create(req, res) {
  try {
    const lead = await service.createLead(req.body, req.user);
    res.status(201).json(lead);
  } catch (err) {
    console.error("CREATE LEAD ERROR:", err);

    const status =
      err.message.includes("obrigatório")
        ? 400
        : 500;

    res.status(status).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const leads = await service.listLeads(req.user);
    res.json(leads);
  } catch (err) {
    console.error("LIST LEADS ERROR:", err);
    res.status(500).json({ error: "Erro ao listar leads" });
  }
}

async function update(req, res) {
  try {
    const lead = await service.updateLead(
      req.params.id,
      req.body,
      req.user
    );
    res.json(lead);
  } catch (err) {
    console.error("UPDATE LEAD ERROR:", err);
    res.status(400).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    await service.deleteLead(req.params.id, req.user);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE LEAD ERROR:", err);
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  create,
  list,
  update,
  remove
};
