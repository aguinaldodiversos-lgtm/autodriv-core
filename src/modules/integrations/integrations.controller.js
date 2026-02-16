const service = require("./integrations.service");

async function publishCNC(req, res) {
  try {
    const data = await service.publishToCarrosNaCidade(
      req.params.vehicleId,
      req.user
    );
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  publishCNC
};
