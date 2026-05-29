const service = require("./integrations.service");

function sendError(res, err) {
  if (err.payload) {
    return res.status(err.statusCode || 400).json(err.payload);
  }
  return res.status(err.statusCode || 400).json({ error: err.message });
}

async function publishCNC(req, res) {
  try {
    const data = await service.publishToCarrosNaCidade(
      req.params.vehicleId,
      req.user
    );
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
}

async function publishChannel(req, res) {
  try {
    const data = await service.publishToChannel(
      req.params.vehicleId,
      req.user,
      req.params.channel,
      req.body || {}
    );
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
}

async function listVehicle(req, res) {
  try {
    res.json(await service.listVehicleIntegrations(req.params.vehicleId, req.user));
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  publishCNC,
  publishChannel,
  listVehicle
};
