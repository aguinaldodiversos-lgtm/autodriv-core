const repository = require("./approvalPanel.repository");

async function getApprovalAnalysis(saleId, dealershipId) {

  const sale = await repository.getSaleDetails(saleId);

  if (!sale) {
    throw new Error("Venda não encontrada");
  }

  const intake = await repository.getVehicleIntake(sale.vehicle_id);

  const purchaseValue = intake ? Number(intake.purchase_value) : 0;
  const salePrice = Number(sale.sale_price);

  const estimatedMargin = salePrice - purchaseValue;
  const marginPercent = purchaseValue
    ? ((estimatedMargin / purchaseValue) * 100).toFixed(1)
    : 0;

  const sellerMonthSales = await repository.getSellerMonthlySales(
    dealershipId,
    sale.user_id
  );

  const commissionPreview = (salePrice * 0.02).toFixed(2); // 2% base

  return {
    sale_id: sale.id,
    vehicle: {
      brand: sale.brand,
      model: sale.model,
      year: sale.year,
      advertised_price: sale.vehicle_price
    },
    client: {
      name: sale.client_name,
      document: sale.client_document
    },
    seller: {
      name: sale.seller_name,
      monthly_sales: sellerMonthSales
    },
    financial_analysis: {
      purchase_value: purchaseValue,
      sale_price: salePrice,
      estimated_margin: estimatedMargin,
      margin_percent: marginPercent,
      commission_preview: commissionPreview
    },
    approval_status: sale.approval_status
  };
}

module.exports = {
  getApprovalAnalysis
};
