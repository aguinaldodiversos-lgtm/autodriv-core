const service = require("./dashboard.service");

async function getDashboard(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const data = await service.getDashboardIntelligence(dealershipId);

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Erro ao carregar dashboard inteligente"
    });
  }
}

module.exports = {
  getDashboard
};
