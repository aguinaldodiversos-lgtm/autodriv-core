const service = require("./inbox.service");
const { parsePagination } = require("../../utils/pagination");
const logger = require("../../infrastructure/logger/logger");

async function list(req, res) {
  try {
    const page = parsePagination(req);
    const data = await service.listConversations(req.user, page);
    res.json(data);
  } catch (err) {
    logger.error({ err }, "inbox list failed");
    res.status(500).json({ error: "inbox_list_failed" });
  }
}

async function get(req, res) {
  try {
    const page = parsePagination(req, { defaultLimit: 200, maxLimit: 500 });
    const data = await service.getConversation(
      req.user,
      req.params.leadId,
      page
    );
    res.json(data);
  } catch (err) {
    logger.error({ err, lead_id: req.params.leadId }, "inbox get failed");
    res.status(500).json({ error: "inbox_get_failed" });
  }
}

async function send(req, res) {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem obrigatória" });
    }

    const data = await service.sendHumanMessage(
      req.user,
      req.params.leadId,
      message
    );

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  list,
  get,
  send
};
