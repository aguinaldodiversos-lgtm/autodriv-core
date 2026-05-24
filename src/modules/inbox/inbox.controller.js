const service = require("./inbox.service");
const { parsePagination } = require("../../utils/pagination");

async function list(req, res) {
  try {
    const { limit, offset } = parsePagination(req.query, {
      defaultLimit: 50,
      maxLimit: 200
    });
    const data = await service.listConversations(req.user, {
      limit,
      offset,
      status: req.query.status,
      channel: req.query.channel,
      assigned_user_id: req.query.assigned_user_id,
      sla: req.query.sla
    });
    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function get(req, res) {
  try {
    const data = await service.getConversation(
      req.user,
      req.params.threadId
    );
    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
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
      req.params.threadId,
      message
    );

    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
}

async function claim(req, res) {
  try {
    res.json(await service.claimThread(req.user, req.params.threadId));
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
}

async function updateThread(req, res) {
  try {
    res.json(await service.updateThread(req.user, req.params.threadId, req.body));
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
}

async function listTemplates(req, res) {
  try {
    res.json(await service.listTemplates(req.user, req.query.channel));
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function upsertTemplate(req, res) {
  try {
    res.json(await service.upsertTemplate(req.user, req.body));
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
}

module.exports = {
  list,
  get,
  send,
  claim,
  updateThread,
  listTemplates,
  upsertTemplate
};
