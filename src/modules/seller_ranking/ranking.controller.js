const service = require("./ranking.service");

async function getRanking(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    const ranking = await service.calculateRanking(
      dealershipId,
      month,
      year
    );

    res.json(ranking);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Erro ao gerar ranking"
    });
  }
}

module.exports = {
  getRanking
};
