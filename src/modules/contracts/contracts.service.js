// src/modules/contracts/contracts.service.js

const db = require("../../config/db");
const repository = require("./contracts.repository");
const { generatePDF } = require("./contract.generator");
const path = require("path");

/*
=====================================================
UPDATE CONTRACT (COM BLOQUEIO APÓS APROVAÇÃO)
=====================================================
*/

async function updateContract(contractId, data, user) {
  const contract = await repository.findById(contractId);

  if (!contract) {
    throw new Error("Contrato não encontrado.");
  }

  // 🔒 BLOQUEIO ABSOLUTO APÓS APROVAÇÃO
  if (contract.status === "approved") {
    throw new Error(
      "Contrato aprovado não pode ser editado. Crie uma nova versão."
    );
  }

  // 🔒 BLOQUEIO SE ESTIVER EM APROVAÇÃO
  if (contract.status === "pending_approval") {
    throw new Error(
      "Contrato em aprovação não pode ser editado."
    );
  }

  // 🔐 Permissão mínima (seller, manager ou admin)
  if (!["seller", "manager", "admin"].includes(user.role)) {
    throw new Error("Você não tem permissão para editar contrato.");
  }

  return repository.update(contractId, data);
}

/*
=====================================================
ENVIO PARA APROVAÇÃO
=====================================================
*/

async function sendForApproval(contractId) {
  const contract = await repository.findById(contractId);

  if (!contract) {
    throw new Error("Contrato não encontrado.");
  }

  if (contract.status !== "draft" && contract.status !== "rejected") {
    throw new Error(
      "Somente contratos em rascunho ou rejeitados podem ser enviados."
    );
  }

  return repository.updateStatus(contractId, "pending_approval", null, null);
}

/*
=====================================================
APROVAR CONTRATO
=====================================================
*/

async function approveContract(contractId, user) {
  if (!["manager", "admin"].includes(user.role)) {
    throw new Error("Sem permissão para aprovar contrato.");
  }

  const contract = await repository.findById(contractId);

  if (!contract) {
    throw new Error("Contrato não encontrado.");
  }

  if (contract.status !== "pending_approval") {
    throw new Error("Contrato não está pendente de aprovação.");
  }

  return repository.updateStatus(contractId, "approved", user.id, null);
}

/*
=====================================================
REJEITAR CONTRATO
=====================================================
*/

async function rejectContract(contractId, user, reason) {
  if (!["manager", "admin"].includes(user.role)) {
    throw new Error("Sem permissão para rejeitar contrato.");
  }

  const contract = await repository.findById(contractId);

  if (!contract) {
    throw new Error("Contrato não encontrado.");
  }

  if (contract.status !== "pending_approval") {
    throw new Error("Contrato não está pendente de aprovação.");
  }

  if (!reason) {
    throw new Error("Motivo da rejeição é obrigatório.");
  }

  return repository.updateStatus(contractId, "rejected", user.id, reason);
}

/*
=====================================================
GERAR PDF (SÓ SE APROVADO)
=====================================================
*/

async function generateContract(contractId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const contract = await repository.findById(contractId);

    if (!contract) {
      throw new Error("Contrato não encontrado.");
    }

    // 🔒 BLOQUEIO: só gera PDF se aprovado
    if (contract.status !== "approved") {
      throw new Error(
        "Contrato precisa estar aprovado para gerar PDF."
      );
    }

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

module.exports = {
  updateContract,
  sendForApproval,
  approveContract,
  rejectContract,
  generateContract
};
/*
=====================================================
CRIAR NOVA VERSÃO DO CONTRATO (DUPLICAR)
=====================================================
*/

async function duplicateContract(contractId, user) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const contract = await repository.findById(contractId);

    if (!contract) {
      throw new Error("Contrato não encontrado.");
    }

    // 🔒 Só pode duplicar contrato aprovado
    if (contract.status !== "approved") {
      throw new Error(
        "Somente contratos aprovados podem gerar nova versão."
      );
    }

    // 🔐 Permissão mínima
    if (!["seller", "manager", "admin"].includes(user.role)) {
      throw new Error("Você não tem permissão para duplicar contrato.");
    }

    const newVersion = contract.version + 1;

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
