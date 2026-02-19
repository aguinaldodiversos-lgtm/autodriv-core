const repository = require("./contracts.repository");

async function generateContract(saleId, user) {

  const sale = await repository.getSaleById(saleId);

  if (!sale) {
    throw new Error("Venda não encontrada");
  }

  if (sale.approval_status !== "approved") {
    throw new Error("Venda ainda não aprovada pelo gerente");
  }

  const contract = await repository.createContract({
    dealership_id: sale.dealership_id,
    sale_id: sale.id,
    vehicle_id: sale.vehicle_id,
    client_id: sale.client_id,
    user_id: user.id
  });

  return contract;
}

module.exports = {
  generateContract
};
