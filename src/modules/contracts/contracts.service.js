// src/modules/contracts/contracts.service.js

const path = require("path");
const db = require("../../config/db");
const repository = require("./contracts.repository");
const { generatePDF } = require("./contract.generator");

async function generateContract(saleId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const sale = await repository.findSaleById(saleId);

    if (!sale) {
      throw new Error("Venda não encontrada.");
    }

    if (sale.status !== "approved") {
      throw new Error("Contrato só pode ser gerado para vendas aprovadas.");
    }

    const version = await repository.getNextVersion(saleId, client);

    const templateName = sale.trade_brand
      ? "contract-sale-trade.html"
      : "contract-sale.html";

    const fileName = `contract-${saleId}-v${version}.pdf`;
    const outputPath = path.join(
      process.cwd(),
      "uploads",
      "contracts",
      fileName
    );

    const contractDate = new Date().toLocaleDateString("pt-BR");

    const data = {
      ...sale,
      CONTRACT_DATE: contractDate
    };

    const { hash } = await generatePDF({
      templateName,
      data,
      outputPath
    });

    const contract = await repository.createContractRecord({
      sale_id: saleId,
      version,
      file_path: outputPath,
      hash,
      dealership_id: sale.dealership_id
    }, client);

    await client.query("COMMIT");

    return contract;

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  generateContract
};
