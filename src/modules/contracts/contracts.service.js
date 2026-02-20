// src/modules/contracts/contract.service.js

const path = require("path");
const { generatePDF } = require("./contract.generator");
const db = require("../../config/db")
});

async function getSaleById(saleId) {
  const { rows } = await pool.query(
    "SELECT * FROM sales WHERE id = $1",
    [saleId]
  );

  return rows[0];
}

async function getNextVersion(saleId) {
  const { rows } = await pool.query(
    "SELECT MAX(version) as max_version FROM contracts WHERE sale_id = $1",
    [saleId]
  );

  return (rows[0].max_version || 0) + 1;
}

async function createContract(saleId) {
  const sale = await getSaleById(saleId);

  if (!sale) {
    throw new Error("Venda não encontrada.");
  }

  if (sale.status !== "approved") {
    throw new Error("Contrato só pode ser gerado para vendas aprovadas.");
  }

  const version = await getNextVersion(saleId);

  const templateName = sale.trade_vehicle_brand
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

  const { rows } = await pool.query(
    `INSERT INTO contracts 
     (sale_id, version, file_path, hash, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [saleId, version, outputPath, hash]
  );

  return rows[0];
}

module.exports = {
  createContract
};
