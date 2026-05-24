const service = require("./afterSales.service");

function sendError(res, err) {
  res.status(err.statusCode || 500).json({ error: err.message });
}

async function generate(req, res) {
  try {
    res.json(await service.generateOpportunities(req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function list(req, res) {
  try {
    res.json(await service.listOpportunities(req.user, req.query));
  } catch (err) {
    sendError(res, err);
  }
}

async function update(req, res) {
  try {
    res.json(await service.updateOpportunity(req.user, req.params.id, req.body.status));
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  generate,
  list,
  update
};
