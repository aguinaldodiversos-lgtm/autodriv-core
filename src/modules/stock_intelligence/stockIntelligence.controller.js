const service = require("./stockIntelligence.service");

function sendError(res, err) {
  res.status(err.statusCode || 500).json({ error: err.message });
}

async function list(req, res) {
  try {
    res.json(await service.listStock(req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function get(req, res) {
  try {
    res.json(await service.getVehicleIntelligence(req.user, req.params.vehicleId));
  } catch (err) {
    sendError(res, err);
  }
}

async function update(req, res) {
  try {
    res.json(await service.updateStockProfile(req.user, req.params.vehicleId, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function appraisal(req, res) {
  try {
    res.status(201).json(await service.createAppraisal(req.user, req.params.vehicleId, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function preparationTask(req, res) {
  try {
    res.json(await service.upsertPreparationTask(req.user, req.params.vehicleId, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  list,
  get,
  update,
  appraisal,
  preparationTask
};
