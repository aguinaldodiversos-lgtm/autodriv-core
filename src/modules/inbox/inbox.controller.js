const service = require("./inbox.service");

async function list(req, res) {
  try {
    const data = await service.listConversations(req.user);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function get(req, res) {
  try {
    const data = await service.getConversation(
      req.user,
      req.params.leadId
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
