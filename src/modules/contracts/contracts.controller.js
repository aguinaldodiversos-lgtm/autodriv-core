const service = require("./contracts.service");

async function create(req, res) {
  try {
    const contract = await service.generateContract(
      req.params.saleId,
      req.user
    );

    res.json(contract);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  create
};
