const service = require("./aiSeller.service");

async function message(req, res) {
  try {
    const { lead_id, message } = req.body;

    const data = await service.handleMessage(lead_id, message);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  message
};
