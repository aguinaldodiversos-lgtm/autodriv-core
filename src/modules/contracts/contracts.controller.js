// src/modules/contracts/contract.controller.js

const contractService = require("./contract.service");

async function generateContract(req, res) {
  try {
    const { saleId } = req.params;

    const contract = await contractService.createContract(saleId);

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
  generateContract
};
