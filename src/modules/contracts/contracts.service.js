// src/modules/contracts/contracts.service.js

const db = require("../../config/db");
const repository = require("./contracts.repository");
const { generatePDF } = require("./contract.generator");
const path = require("path");

async function listContracts(user, filters = {}) {
  return repository.findAll(user.dealership_id, filters);
}

async function getContract(contractId, user) {
  const contract = await repository.findById(contractId, user.dealership_id);

  if (!contract) {
    const err = new Error("Contrato nao encontrado.");
    err.statusCode = 404;
    throw err;
  }

  return contract;
}

async function updateContract(contractId, data, user) {
  const contract = await repository.findById(contractId, user.dealership_id);

  if (!contract) {
    throw new Error("Contrato não encontrado.");
  }

  if (contract.status === "approved") {
    throw new Error(
      "Contrato aprovado não pode ser editado. Crie uma nova versão."
    );
  }

  if (contract.status === "pending_approval") {
    throw new Error(
      "Contrato em aprovação não pode ser editado."
    );
  }

  if (!["seller", "manager", "admin"].includes(user.role)) {
    throw new Error("Você não tem permissão para editar contrato.");
  }

  return repository.update(contractId, user.dealership_id, data);
}

async function sendForApproval(contractId, user) {
  const contract = await repository.findById(contractId, user.dealership_id);

  if (!contract) {
    throw new Error("Contrato não encontrado.");
  }

  if (contract.status !== "draft" && contract.status !== "rejected") {
    throw new Error(
      "Somente contratos em rascunho ou rejeitados podem ser enviados."
    );
  }

  return repository.updateStatus(
    contractId,
    user.dealership_id,
    "pending_approval",
    null,
    null
  );
}

async function approveContract(contractId, user) {
  if (!["manager", "admin"].includes(user.role)) {
    throw new Error("Sem permissão para aprovar contrato.");
  }

  const contract = await repository.findById(contractId, user.dealership_id);

  if (!contract) {
    throw new Error("Contrato não encontrado.");
  }

  if (contract.status !== "pending_approval") {
    throw new Error("Contrato não está pendente de aprovação.");
  }

  return repository.updateStatus(
    contractId,
    user.dealership_id,
    "approved",
    user.id,
    null
  );
}

async function rejectContract(contractId, user, reason) {
  if (!["manager", "admin"].includes(user.role)) {
    throw new Error("Sem permissão para rejeitar contrato.");
  }

  const contract = await repository.findById(contractId, user.dealership_id);

  if (!contract) {
    throw new Error("Contrato não encontrado.");
  }

  if (contract.status !== "pending_approval") {
    throw new Error("Contrato não está pendente de aprovação.");
  }

  if (!reason) {
    throw new Error("Motivo da rejeição é obrigatório.");
  }

  return repository.updateStatus(
    contractId,
    user.dealership_id,
    "rejected",
    user.id,
    reason
  );
}

async function generateContract(contractId, user) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const contract = await repository.findById(contractId, user.dealership_id);

    if (!contract) {
      throw new Error("Contrato não encontrado.");
    }

    if (contract.status !== "approved") {
      throw new Error(
        "Contrato precisa estar aprovado para gerar PDF."
      );
    }

    const sale = await repository.findSaleById(
      contract.sale_id,
      user.dealership_id
    );

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

async function duplicateContract(contractId, user) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const contract = await repository.findById(contractId, user.dealership_id);

    if (!contract) {
      throw new Error("Contrato não encontrado.");
    }

    if (contract.status !== "approved") {
      throw new Error(
        "Somente contratos aprovados podem gerar nova versão."
      );
    }

    if (!["seller", "manager", "admin"].includes(user.role)) {
      throw new Error("Você não tem permissão para duplicar contrato.");
    }

    const newVersion = await repository.getNextVersion(contract.sale_id, client);

    const newContract = await repository.createDraftFromPrevious(
      contract,
      newVersion,
      client
    );

    await client.query("COMMIT");

    return newContract;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listContracts,
  getContract,
  updateContract,
  sendForApproval,
  approveContract,
  rejectContract,
  generateContract,
  duplicateContract
};
