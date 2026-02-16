const service = require("./dashboard.service");

async function alerts(req, res) {
  try {
    const data = await service.getAlerts(req.user);
    res.json({ alerts: data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  alerts
};
