const service = require("./aiSettings.service");

async function getSettings(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const data = await service.getSettings(dealershipId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar configurações" });
  }
}

async function updateSettings(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const data = await service.updateSettings(dealershipId, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar configurações" });
  }
}

module.exports = {
  getSettings,
  updateSettings
};
