const service = require("./vehicles.service");
const { applySuggestion } = require("./applySuggestion.service");

function errorStatus(err) {
  const message = err && err.message ? err.message : "";
  if (message.toLowerCase().includes("nao encontrado")) return 404;
  return 400;
}

async function getVehicles(req, res) {
  try {
    if (req.query.view) {
      const panel = await service.listOperationalVehicles(req.user, req.query);
      return res.json(panel);
    }
    const vehicles = await service.listVehicles(req.user);
    return res.json(vehicles);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload || { error: err.message });
    }
    console.error("Erro ao listar veiculos:", err);
    return res.status(500).json({ error: "Erro ao listar veiculos" });
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

async function sellVehicle(req, res) {
  try {
    const result = await service.markVehicleAsSold(req.params.id, req.body, req.user);
    return res.json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload || { error: err.message });
    }
    return res.status(errorStatus(err)).json({ error: err.message });
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
  sellVehicle,
  applyVehicleSuggestion
};
