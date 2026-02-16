const service = require("./proposals.service");

async function create(req, res) {
  try {
    const proposal = await service.createProposal(req.body, req.user);
    res.json(proposal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const proposals = await service.listProposals(req.user);
    res.json(proposals);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const proposal = await service.updateProposal(
      req.params.id,
      req.body,
      req.user
    );
    res.json(proposal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    await service.deleteProposal(req.params.id, req.user);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  create,
  list,
  update,
  remove
};
