const service = require("./integrations.service");

async function publishCNC(req, res) {
  try {
    const data = await service.publishToCarrosNaCidade(
      req.params.vehicleId,
      req.user
    );
    res.json(data);
  } catch (err) {
    if (err.payload) {
      return res.status(err.statusCode || 400).json(err.payload);
    }
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  publishCNC
};
