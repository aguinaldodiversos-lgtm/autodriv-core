const repo = require("./finance.repository");

async function createTransaction(data, user) {
  return repo.create({
    dealership_id: user.dealershipId,
    type: data.type,
    category: data.category,
    description: data.description,
    amount: data.amount,
    due_date: data.due_date,
    status: "pending",
    related_sale_id: data.related_sale_id || null
  });
}

async function listTransactions(user) {
  return repo.findAll(user.dealershipId);
}

async function payTransaction(id, user) {
  return repo.markAsPaid(id, user.dealershipId);
}

async function getFinanceSummary(user) {
  return repo.getSummary(user.dealershipId);
}

module.exports = {
  createTransaction,
  listTransactions,
  payTransaction,
  getFinanceSummary
};
