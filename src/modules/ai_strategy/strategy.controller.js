const service = require("./strategy.service");

async function getStrategy(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const strategy = await service.generateConversionStrategy(dealershipId);

    res.json(strategy);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Erro ao gerar estratégia IA"
    });
  }
}

module.exports = {
  getStrategy
};
