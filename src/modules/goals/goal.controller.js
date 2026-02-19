const service = require("./goal.service");

async function setGoal(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const result = await service.setMonthlyGoal(
      req.body,
      dealershipId
    );

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Erro ao definir meta"
    });
  }
}

async function getProgress(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    const progress = await service.getGoalProgress(
      dealershipId,
      month,
      year
    );

    res.json(progress);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Erro ao calcular progresso"
    });
  }
}

module.exports = {
  setGoal,
  getProgress
};
