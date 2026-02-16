const service = require("./finance.service");

async function create(req, res) {
  try {
    const tx = await service.createTransaction(req.body, req.user);
    res.json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const txs = await service.listTransactions(req.user);
    res.json(txs);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function pay(req, res) {
  try {
    const tx = await service.payTransaction(req.params.id, req.user);
    res.json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function summary(req, res) {
  try {
    const data = await service.getFinanceSummary(req.user);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  create,
  list,
  pay,
  summary
};
