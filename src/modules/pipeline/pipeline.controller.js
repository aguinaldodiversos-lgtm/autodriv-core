const service = require("./pipeline.service");

function sendError(res, err) {
  res.status(err.statusCode || 500).json({ error: err.message });
}

async function getPipeline(req, res) {
  try {
    res.json(await service.getPipeline(req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function listStages(req, res) {
  try {
    res.json(await service.listStages(req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function upsertStage(req, res) {
  try {
    res.json(await service.upsertStage(req.user, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function listCloseReasons(req, res) {
  try {
    res.json(await service.listCloseReasons(req.user, req.query.type));
  } catch (err) {
    sendError(res, err);
  }
}

async function upsertCloseReason(req, res) {
  try {
    res.json(await service.upsertCloseReason(req.user, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function updateStage(req, res) {
  try {
    res.json(await service.moveLead(req.user, req.params.id, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function addActivity(req, res) {
  try {
    res.json(await service.addActivity(req.user, req.params.id, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function listActivities(req, res) {
  try {
    res.json(await service.listActivities(req.user, req.params.id));
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  getPipeline,
  listStages,
  upsertStage,
  listCloseReasons,
  upsertCloseReason,
  updateStage,
  addActivity,
  listActivities
};
