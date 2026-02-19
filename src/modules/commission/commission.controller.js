const service = require("./commission.service");

async function getCommission(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    const data = await service.calculateCommission(
      dealershipId,
      month,
      year
    );

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Erro ao calcular comissão"
    });
  }
}

module.exports = {
  getCommission
};
