const service = require("./public.service");

async function dealership(req, res) {
  try {
    const data = await service.getVehiclesByDealership(req.params.slug);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function vehicle(req, res) {
  try {
    const data = await service.getVehicleBySlug(
      req.params.slug,
      req.params.vehicleSlug
    );
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  dealership,
  vehicle
};
