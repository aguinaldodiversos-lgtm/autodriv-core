const service = require("./maintenance.service");

function handleErr(res, err) {
  if (err && err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  return res.status(400).json({ error: err.message || "Erro" });
}

async function create(req, res) {
  try {
    const data = await service.createMaintenance(req.body, req.user);
    res.json(data);
  } catch (err) {
    handleErr(res, err);
  }
}

async function getByVehicle(req, res) {
  try {
    const data = await service.getMaintenanceByVehicle(
      req.params.vehicleId,
      req.user
    );
    res.json(data);
  } catch (err) {
    handleErr(res, err);
  }
}

async function updateTask(req, res) {
  try {
    const data = await service.updateTask(
      req.params.taskId,
      req.body.status,
      req.user
    );
    res.json(data);
  } catch (err) {
    handleErr(res, err);
  }
}

async function updateDocumentation(req, res) {
  try {
    const data = await service.updateDocumentation(
      req.params.vehicleId,
      req.body.status,
      req.user
    );
    res.json(data);
  } catch (err) {
    handleErr(res, err);
  }
}

module.exports = {
  create,
  getByVehicle,
  updateTask,
  updateDocumentation
};
