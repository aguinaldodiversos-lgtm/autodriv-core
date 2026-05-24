const service = require("./aiSeller.service");

async function message(req, res) {
  try {
    const { lead_id, message } = req.body;

    if (!lead_id || !message) {
      return res.status(400).json({
        error: "lead_id e message são obrigatórios"
      });
    }

    const data = await service.handleMessage(lead_id, message, [], {
      dealershipId: req.user.dealership_id,
      strict: true
    });
    res.json(data);
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) {
      console.error("AI SELLER ERROR:", err);
    }
    res.status(status).json({ error: err.message });
  }
}

module.exports = {
  message
};
