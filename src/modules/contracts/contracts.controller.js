// src/modules/contracts/contracts.controller.js

const service = require("./contracts.service");

async function list(req, res) {
  try {
    const contracts = await service.listContracts(req.user, {
      status: req.query.status,
      limit: req.query.limit
    });
    return res.json(contracts);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message
    });
  }
}

async function get(req, res) {
  try {
    const contract = await service.getContract(req.params.id, req.user);
    return res.json(contract);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message
    });
  }
}

async function sendForApproval(req, res) {
  try {
    const { id } = req.params;
    const result = await service.sendForApproval(id, req.user);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function approve(req, res) {
  try {
    const { id } = req.params;
    const result = await service.approveContract(id, req.user);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function reject(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await service.rejectContract(id, req.user, reason);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
async function generate(req, res) {
  try {
    const { contractId } = req.params;

    const contract = await service.generateContract(contractId, req.user);

    return res.status(201).json({
      success: true,
      contract
    });
  } catch (error) {
    console.error("Erro ao gerar contrato:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  list,
  get,
  sendForApproval,
  approve,
  reject,
  generate
};
