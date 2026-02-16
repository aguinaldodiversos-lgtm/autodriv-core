const service = require("./sales.service");

async function create(req, res) {
  try {
    const sale = await service.createSale(req.body, req.user);
    res.json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const sales = await service.listSales(req.user);
    res.json(sales);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  create,
  list
};
