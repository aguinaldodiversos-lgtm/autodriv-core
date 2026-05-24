const service = require("./vehicles.service");
const { applySuggestion } = require("./applySuggestion.service");

function errorStatus(err) {
  const message = err && err.message ? err.message : "";
  if (message.toLowerCase().includes("nao encontrado")) return 404;
  return 400;
}

async function getVehicles(req, res) {
  try {
    const vehicles = await service.listVehicles(req.user);
    res.json(vehicles);
  } catch (err) {
    console.error("Erro ao listar veiculos:", err);
    res.status(500).json({ error: "Erro ao listar veiculos" });
  }
}

async function getVehicleById(req, res) {
  try {
    const vehicle = await service.getVehicleById(req.params.id, req.user);
    res.json(vehicle);
  } catch (err) {
    res.status(errorStatus(err)).json({ error: err.message });
  }
}

async function createVehicle(req, res) {
  try {
    const vehicle = await service.createVehicle(req.body, req.user);
    res.json(vehicle);
  } catch (err) {
    res.status(errorStatus(err)).json({ error: err.message });
  }
}

async function updateVehicle(req, res) {
  try {
    const vehicle = await service.updateVehicle(
      req.params.id,
      req.body,
      req.user
    );
    res.json(vehicle);
  } catch (err) {
    res.status(errorStatus(err)).json({ error: err.message });
  }
}

async function deleteVehicle(req, res) {
  try {
    await service.deleteVehicle(req.params.id, req.user);
    res.json({ success: true });
  } catch (err) {
    res.status(errorStatus(err)).json({ error: err.message });
  }
}

async function applyVehicleSuggestion(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const { id } = req.params;

    const result = await applySuggestion(id, dealershipId);

    res.json(result);
  } catch (err) {
    console.error("Erro ao aplicar sugestao:", err);
    res.status(500).json({
      error: err.message
    });
  }
}

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  applyVehicleSuggestion
};
