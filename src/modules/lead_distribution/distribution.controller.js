const service = require("./distribution.service");

async function distribute(req, res) {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: "leadId é obrigatório" });
    }

    const userId = await service.distributeLead(leadId, req.user.dealership_id);

    res.json({
      success: true,
      assigned_to: userId
    });

  } catch (err) {
    if (err && err.statusCode) {
      return res
        .status(err.statusCode)
        .json({ error: err.message || "Erro" });
    }
    console.error(err);
    res.status(500).json({ error: "Erro ao distribuir lead" });
  }
}

async function getAdminLeads(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const leads = await service.getAdminLeadList(dealershipId);

    res.json(leads);
  } catch (err) {
    if (err && err.statusCode) {
      return res
        .status(err.statusCode)
        .json({ error: err.message || "Erro" });
    }
    console.error(err);
    res.status(500).json({ error: "Erro ao listar leads" });
  }
}

module.exports = {
  distribute,
  getAdminLeads
};
