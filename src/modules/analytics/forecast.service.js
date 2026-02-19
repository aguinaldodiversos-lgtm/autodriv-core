const pool = require("../../config/db");

/* =====================================================
   PREVISÃO DE VENDAS DO MÊS
===================================================== */

async function calculateMonthlyForecast(dealershipId) {

  const stageWeights = {
    responded: 0.1,
    qualifying: 0.2,
    ready_for_visit: 0.4,
    visit_scheduled: 0.6
  };

  const leadsResult = await pool.query(
    `SELECT l.id,
            v.price,
            s.stage
     FROM leads l
     LEFT JOIN vehicles v
       ON v.id = l.vehicle_id
     LEFT JOIN lead_ai_state s
       ON s.lead_id = l.id
     WHERE l.dealership_id = $1
       AND l.created_at >= date_trunc('month', NOW())`,
    [dealershipId]
  );

  let expectedSales = 0;
  let expectedRevenue = 0;

  for (const lead of leadsResult.rows) {
    const weight = stageWeights[lead.stage] || 0;
    expectedSales += weight;

    if (lead.price) {
      expectedRevenue += lead.price * weight;
    }
  }

  const conservativeSales = Math.floor(expectedSales * 0.8);
  const optimisticSales = Math.ceil(expectedSales * 1.2);

  return {
    total_leads_month: leadsResult.rows.length,
    expected_sales: Number(expectedSales.toFixed(2)),
    conservative_sales: conservativeSales,
    optimistic_sales: optimisticSales,
    expected_revenue: Number(expectedRevenue.toFixed(2))
  };
}

module.exports = {
  calculateMonthlyForecast
};
