const { startWhatsApp } = require("../whatsapp_baileys/whatsapp.baileys");
const { isConnected } = require("../whatsapp_baileys/session.manager");

async function connect(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    if (isConnected(dealershipId)) {
      return res.json({ message: "Já conectado" });
    }

    await startWhatsApp(dealershipId);

    res.json({ message: "Conectando WhatsApp..." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao conectar WhatsApp" });
  }
}

module.exports = {
  connect
};
