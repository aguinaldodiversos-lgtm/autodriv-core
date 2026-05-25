const repo = require("./finance.repository");

function assertDealership(user) {
  if (!user?.dealership_id) {
    throw new Error("Usuario sem loja associada");
  }

  return user.dealership_id;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valor financeiro invalido");
  }

  return amount;
}

function normalizeType(type) {
  if (!["income", "expense"].includes(type)) {
    throw new Error("Tipo financeiro invalido");
  }

  return type;
}

function normalizeStatus(status) {
  if (!status) return "pending";
  if (!["pending", "paid", "cancelled"].includes(status)) {
    throw new Error("Status financeiro invalido");
  }

  return status;
}

async function createTransaction(data, user) {
  const status = normalizeStatus(data.status);

  return repo.create({
    dealership_id: assertDealership(user),
    type: normalizeType(data.type),
    category: data.category || null,
    description: data.description || "Lancamento financeiro",
    amount: normalizeAmount(data.amount),
    due_date: data.due_date || null,
    paid_date: status === "paid" ? data.paid_date || new Date().toISOString().slice(0, 10) : null,
    status,
    vehicle_id: data.vehicle_id || null,
    related_sale_id: data.related_sale_id || null,
    notes: data.notes || null,
    paid_by: status === "paid" ? user.id : null
  });
}

async function listTransactions(user) {
  return repo.findAll(assertDealership(user));
}

async function payTransaction(id, user) {
  const transaction = await repo.markAsPaid(id, assertDealership(user), user.id);
  if (!transaction) {
    throw new Error("Lancamento financeiro nao encontrado");
  }

  return transaction;
}

async function getFinanceSummary(user) {
  return repo.getSummary(assertDealership(user));
}

module.exports = {
  createTransaction,
  listTransactions,
  payTransaction,
  getFinanceSummary
};
