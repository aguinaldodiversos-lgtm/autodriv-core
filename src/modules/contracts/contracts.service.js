async function generateContract(contractId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Buscar contrato
    const contract = await repository.findById(contractId);

    if (!contract) {
      throw new Error("Contrato não encontrado.");
    }

    // 🔒 BLOQUEIO PRINCIPAL
    if (contract.status !== "approved") {
      throw new Error("Contrato precisa estar aprovado para gerar PDF.");
    }

    // Buscar dados da venda vinculada
    const sale = await repository.findSaleById(contract.sale_id);

    if (!sale) {
      throw new Error("Venda vinculada não encontrada.");
    }

    const version = await repository.getNextVersion(contract.sale_id, client);

    const templateName = sale.trade_brand
      ? "contract-sale-trade.html"
      : "contract-sale.html";

    const fileName = `contract-${contract.sale_id}-v${version}.pdf`;

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

    const newContract = await repository.createContractRecord({
      sale_id: contract.sale_id,
      version,
      file_path: outputPath,
      hash,
      dealership_id: sale.dealership_id
    }, client);

    await client.query("COMMIT");

    return newContract;

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
