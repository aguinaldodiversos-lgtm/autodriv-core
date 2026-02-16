const service = require("./leads.service");

async function create(req, res) {
  try {
    const lead = await service.createLead(req.body, req.user);
    res.json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const leads = await service.listLeads(req.user);
    res.json(leads);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    res.status(400).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    await service.deleteLead(req.params.id, req.user);
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
