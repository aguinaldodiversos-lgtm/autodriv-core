const service = require("./vehicles.service");

async function create(req, res) {
  try {
    const vehicle = await service.createVehicle(req.body, req.user);
    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const vehicles = await service.listVehicles(req.user);
    res.json(vehicles);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  create,
  list
};
