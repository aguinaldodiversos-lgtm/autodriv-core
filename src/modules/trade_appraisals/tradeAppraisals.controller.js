const service = require("./tradeAppraisals.service");

function sendError(res, err) {
  if (err.payload) return res.status(err.statusCode || 400).json(err.payload);
  return res.status(err.statusCode || 500).json({ error: err.message });
}

async function list(req, res) {
  try {
    res.json(await service.list(req.user, req.query));
  } catch (err) {
    sendError(res, err);
  }
}

async function get(req, res) {
  try {
    res.json(await service.get(req.user, req.params.id));
  } catch (err) {
    sendError(res, err);
  }
}

async function create(req, res) {
  try {
    res.status(201).json(await service.create(req.user, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function update(req, res) {
  try {
    res.json(await service.update(req.user, req.params.id, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function recalculate(req, res) {
  try {
    res.json(await service.recalculate(req.user, req.params.id));
  } catch (err) {
    sendError(res, err);
  }
}

async function offer(req, res) {
  try {
    res.json(await service.makeOffer(req.user, req.params.id, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function accept(req, res) {
  try {
    res.json(await service.accept(req.user, req.params.id, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function reject(req, res) {
  try {
    res.json(await service.reject(req.user, req.params.id, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function convertToStock(req, res) {
  try {
    res.status(201).json(await service.convertToStock(req.user, req.params.id));
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  recalculate,
  offer,
  accept,
  reject,
  convertToStock
};
