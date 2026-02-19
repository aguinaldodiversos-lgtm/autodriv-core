const service = require("./priority.service");

async function getTopLeads(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const leads = await service.getTopPriorityLeads(dealershipId);

    res.json(leads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar leads prioritários" });
  }
}

module.exports = {
  getTopLeads
};
