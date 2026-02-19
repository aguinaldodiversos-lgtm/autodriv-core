const service = require("./funnel.service");

async function getFunnelAnalysis(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const analysis = await service.analyzeFunnel(dealershipId);

    res.json(analysis);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Erro ao analisar funil"
    });
  }
}

module.exports = {
  getFunnelAnalysis
};
