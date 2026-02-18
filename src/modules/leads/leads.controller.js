const service = require("./leads.service");
const scoreService = require("./leadScore.service");

/* =========================
   CRIAR LEAD
========================= */
async function create(req, res) {
  try {
    const lead = await service.createLead(req.body, req.user);
    res.json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/* =========================
   LISTAR LEADS
========================= */
async function list(req, res) {
  try {
    const leads = await service.listLeads(req.user);
    res.json(leads);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/* =========================
   ATUALIZAR LEAD
========================= */
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

/* =========================
   REMOVER LEAD
========================= */
async function remove(req, res) {
  try {
    await service.deleteLead(req.params.id, req.user);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/* =========================
   REATIVAR LEAD COM IA
========================= */
async function reactivate(req, res) {
  try {
    const result = await service.reactivateLead(
      req.params.id,
      req.user
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/* =========================
   CONSULTAR SCORE DO LEAD
========================= */
async function getScore(req, res) {
  try {
    const result = await scoreService.getLeadScore(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  create,
  list,
  update,
  remove,
  reactivate,
  getScore
};
