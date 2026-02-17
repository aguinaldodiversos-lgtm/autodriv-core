const service = require("./whatsapp.service");

async function webhook(req, res) {
  try {
    await service.handleIncomingMessage(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro WhatsApp:", err);
    res.sendStatus(500);
  }
}

module.exports = {
  webhook
};
