const service = require("./aiSettings.service");

async function getSettings(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const data = await service.getSettings(dealershipId);
    res.json(data);
  } catch (err) {
    console.error("GET AI SETTINGS ERROR:", err);
    res.status(500).json({ error: "Erro ao buscar configurações" });
  }
}

async function updateSettings(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const data = await service.updateSettings(dealershipId, req.body);
    res.json(data);
  } catch (err) {
    console.error("UPDATE AI SETTINGS ERROR:", err);
    res.status(500).json({ error: "Erro ao atualizar configurações" });
  }
}

module.exports = {
  getSettings,
  updateSettings
};
