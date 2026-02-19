const service = require("./forecast.service");

async function getMonthlyForecast(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const forecast = await service.calculateMonthlyForecast(dealershipId);

    res.json(forecast);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Erro ao calcular previsão"
    });
  }
}

module.exports = {
  getMonthlyForecast
};
