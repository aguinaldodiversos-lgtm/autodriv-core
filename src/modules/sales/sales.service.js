const repository = require("./sales.repository");

async function createDraftSale(data) {
  return await repository.createSale(data);
}

async function submitForApproval(saleId, user) {
  const sale = await repository.getSaleById(saleId, user.dealership_id);

  if (!sale) throw new Error("Venda não encontrada");

  if (sale.approval_status !== "draft" && sale.approval_status !== "rejected") {
    throw new Error("Venda não pode ser enviada para aprovação");
  }

  return await repository.updateApprovalStatus(
    saleId,
    "pending",
    user.id,
    "Enviado para aprovação",
    user.dealership_id
  );
}

async function approveSale(saleId, user) {
  const sale = await repository.getSaleById(saleId, user.dealership_id);

  if (!sale) throw new Error("Venda não encontrada");

  if (sale.approval_status !== "pending") {
    throw new Error("Venda não está pendente");
  }

  return await repository.updateApprovalStatus(
    saleId,
    "approved",
    user.id,
    "Venda aprovada",
    user.dealership_id
  );
}

async function rejectSale(saleId, user, reason) {
  const sale = await repository.getSaleById(saleId, user.dealership_id);

  if (!sale) throw new Error("Venda não encontrada");

  if (sale.approval_status !== "pending") {
    throw new Error("Venda não está pendente");
  }

  return await repository.updateApprovalStatus(
    saleId,
    "rejected",
    user.id,
    reason,
    user.dealership_id
  );
}

module.exports = {
  createDraftSale,
  submitForApproval,
  approveSale,
  rejectSale
};
