
const service = require("./sales.service");

async function create(req, res) {
  try {
    const data = {
      dealership_id: req.user.dealership_id,
      vehicle_id: req.body.vehicle_id,
      client_id: req.body.client_id,
      user_id: req.user.id,
      sale_price: req.body.sale_price
    };

    const sale = await service.createDraftSale(data);

    res.json(sale);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function submit(req, res) {
  try {
    const sale = await service.submitForApproval(
      req.params.id,
      req.user
    );

    res.json(sale);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function approve(req, res) {
  try {
    const sale = await service.approveSale(
      req.params.id,
      req.user
    );

    res.json(sale);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function reject(req, res) {
  try {
    const sale = await service.rejectSale(
      req.params.id,
      req.user,
      req.body.reason
    );

    res.json(sale);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  create,
  submit,
  approve,
  reject
};
