const service = require("./leadAiReception.service");
const conversationRepo = require("../lead_conversations/leadConversations.repository");

async function message(req, res) {
  try {
    const { lead_id, message } = req.body || {};
    if (!lead_id || !message) {
      return res.status(400).json({ error: "lead_id e message sao obrigatorios" });
    }

    const history = await conversationRepo.getRecentHistory(
      lead_id,
      req.user.dealership_id,
      12
    );

    const result = await service.handleLeadMessage({
      leadId: lead_id,
      dealershipId: req.user.dealership_id,
      message,
      history
    });

    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

module.exports = {
  message
};
