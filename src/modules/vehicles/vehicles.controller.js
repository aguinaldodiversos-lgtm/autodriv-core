const service = require("./vehicles.service");

async function create(req, res) {
  try {
    const vehicle = await service.createVehicle(req.body, req.user);
    res.status(201).json(vehicle);
  } catch (err) {
    console.error("CREATE VEHICLE ERROR:", err);

    const status =
      err.message.includes("não") ||
      err.message.includes("obrigatório")
        ? 400
        : 500;

    res.status(status).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const vehicles = await service.listVehicles(req.user);
    res.json(vehicles);
  } catch (err) {
    console.error("LIST VEHICLES ERROR:", err);
    res.status(500).json({ error: "Erro ao listar veículos" });
  }
}

module.exports = {
  create,
  list
};
