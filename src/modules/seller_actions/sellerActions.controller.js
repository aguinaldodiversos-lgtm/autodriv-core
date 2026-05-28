const service = require("./sellerActions.service");
const { parsePagination } = require("../../utils/pagination");

async function list(req, res) {
  try {
    const { limit, offset } = parsePagination(req.query, {
      defaultLimit: 50,
      maxLimit: 200
    });
    res.json(
      await service.listActions(req.user, {
        ...req.query,
        limit,
        offset
      })
    );
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function claim(req, res) {
  try {
    res.json(await service.claimAction(req.user, req.params.id));
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
}

async function complete(req, res) {
  try {
    res.json(await service.completeAction(req.user, req.params.id, req.body));
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
}

async function dismiss(req, res) {
  try {
    res.json(await service.dismissAction(req.user, req.params.id, req.body));
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
}

module.exports = {
  list,
  claim,
  complete,
  dismiss
};
