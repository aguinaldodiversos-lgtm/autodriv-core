const service = require("./maintenance.service");

async function create(req, res) {
  try {
    const data = await service.createMaintenance(req.body, req.user);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    res.status(400).json({ error: err.message });
  }
}

async function updateTask(req, res) {
  try {
    const data = await service.updateTask(
      req.params.taskId,
      req.body.status
    );
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  create,
  getByVehicle,
  updateTask,
  updateDocumentation
};
