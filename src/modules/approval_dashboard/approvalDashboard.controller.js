const service = require("./approvalDashboard.service");

async function listPending(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const data = await service.getPendingApprovals(dealershipId);

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "Erro ao listar aprovações pendentes" });
  }
}

module.exports = {
  listPending
};
