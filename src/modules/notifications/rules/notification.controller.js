const service = require("./notification.service");

async function getNotifications(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const notifications = await service.generateNotifications(dealershipId);

    res.json(notifications);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Erro ao gerar notificações"
    });
  }
}

module.exports = {
  getNotifications
};
