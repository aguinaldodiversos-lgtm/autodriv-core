const repo = require("./finance.repository");

async function createTransaction(data, user) {
  return repo.create({
    dealership_id: user.dealership_id,
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
  return repo.findAll(user.dealership_id);
}

async function payTransaction(id, user) {
  return repo.markAsPaid(id, user.dealership_id);
}

async function getFinanceSummary(user) {
  return repo.getSummary(user.dealership_id);
}

module.exports = {
  createTransaction,
  listTransactions,
  payTransaction,
  getFinanceSummary
};
