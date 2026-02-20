// src/modules/contracts/contracts.controller.js

const service = require("./contracts.service");

async function generate(req, res) {
  try {
    const { saleId } = req.params;

    const contract = await service.generateContract(saleId);

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
  generate
};
