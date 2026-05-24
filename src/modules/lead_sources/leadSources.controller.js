const service = require("./leadSources.service");

function sendError(res, err) {
  res.status(err.statusCode || 500).json({ error: err.message });
}

async function list(req, res) {
  try {
    res.json(await service.listSources(req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function create(req, res) {
  try {
    res.status(201).json(await service.createSource(req.user, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function update(req, res) {
  try {
    res.json(await service.updateSource(req.user, req.params.id, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function webhook(req, res) {
  try {
    const token =
      req.headers["x-autodriv-webhook-token"] ||
      req.headers["x-webhook-token"] ||
      req.query.token;
    res.status(202).json(
      await service.ingestWebhook(req.params.sourceKey, String(token || ""), req.body)
    );
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  list,
  create,
  update,
  webhook
};
