const service = require("./adPreparation.service");

function sendError(res, err) {
  if (err.payload) return res.status(err.statusCode || 400).json(err.payload);
  return res.status(err.statusCode || 400).json({ error: err.message });
}

async function getPreparation(req, res) {
  try {
    res.json(await service.getPreparation(req.params.vehicleId, req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function recalculate(req, res) {
  try {
    res.json(await service.evaluate(req.params.vehicleId, req.user, { persist: true }));
  } catch (err) {
    sendError(res, err);
  }
}

async function suggestDescription(req, res) {
  try {
    res.json(await service.suggestDescription(req.params.vehicleId, req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function suggestPrice(req, res) {
  try {
    res.json(await service.suggestPrice(req.params.vehicleId, req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function suggestPriority(req, res) {
  try {
    res.json(await service.suggestPriority(req.params.vehicleId, req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function acceptSuggestion(req, res) {
  try {
    res.json(
      await service.acceptSuggestion(
        req.params.vehicleId,
        req.params.suggestionId,
        req.user
      )
    );
  } catch (err) {
    sendError(res, err);
  }
}

async function rejectSuggestion(req, res) {
  try {
    res.json(
      await service.rejectSuggestion(
        req.params.vehicleId,
        req.params.suggestionId,
        req.user
      )
    );
  } catch (err) {
    sendError(res, err);
  }
}

async function createOverride(req, res) {
  try {
    res.json(await service.createOverride(req.params.vehicleId, req.user, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function publish(req, res) {
  try {
    res.json(await service.publishVehicle(req.params.vehicleId || req.params.id, req.user));
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  getPreparation,
  recalculate,
  suggestDescription,
  suggestPrice,
  suggestPriority,
  acceptSuggestion,
  rejectSuggestion,
  createOverride,
  publish
};
