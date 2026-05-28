const service = require("./whatsappAi.service");

function sanitizeSettingsPayload(body = {}) {
  const allowed = [
    "ai_whatsapp_enabled",
    "ai_auto_reply_enabled",
    "ai_handoff_enabled",
    "ai_max_auto_messages_per_lead",
    "ai_business_hours_only",
    "ai_after_hours_message",
    "ai_graceful_handoff_message",
    "ai_default_seller_id",
    "ai_escalation_threshold",
    "ai_low_confidence_threshold",
    "ai_unknown_retry_limit",
    "ai_allowed_intents",
    "ai_blocked_keywords",
    "ai_reply_delay_seconds"
  ];
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key))
  );
}

async function getSettings(req, res) {
  try {
    const settings = await service.getSettings(req.user.dealership_id);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar configuracoes do WhatsApp AI" });
  }
}

async function updateSettings(req, res) {
  try {
    const settings = await service.updateSettings(
      req.user.dealership_id,
      sanitizeSettingsPayload(req.body || {})
    );
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar configuracoes do WhatsApp AI" });
  }
}

async function testClassify(req, res) {
  const message = req.body?.message;
  if (!message) return res.status(400).json({ error: "message e obrigatorio" });
  res.json(service.testClassify(message));
}

async function testReply(req, res) {
  const message = req.body?.message;
  if (!message) return res.status(400).json({ error: "message e obrigatorio" });
  res.json(service.testReply(message));
}

module.exports = {
  getSettings,
  updateSettings,
  testClassify,
  testReply
};
