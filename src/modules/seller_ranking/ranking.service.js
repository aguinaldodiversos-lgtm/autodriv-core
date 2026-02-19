const pool = require("../../config/db");

/* =====================================================
   RANKING DE VENDEDORES
===================================================== */

async function calculateRanking(dealershipId, month, year) {

  const sellers = await pool.query(
    `SELECT id, name
     FROM users
     WHERE dealership_id = $1
     AND role = 'seller'`,
    [dealershipId]
  );

  const ranking = [];

  for (const seller of sellers.rows) {

    // Vendas do mês
    const salesResult = await pool.query(
      `SELECT COUNT(*) as total_sales,
              COALESCE(SUM(sale_price),0) as total_revenue
       FROM sales
       WHERE dealership_id = $1
       AND user_id = $2
       AND EXTRACT(MONTH FROM created_at) = $3
       AND EXTRACT(YEAR FROM created_at) = $4`,
      [dealershipId, seller.id, month, year]
    );

    const totalSales = parseInt(salesResult.rows[0].total_sales);
    const totalRevenue = parseFloat(salesResult.rows[0].total_revenue);

    // Leads atendidos
    const leadsResult = await pool.query(
      `SELECT COUNT(*) 
       FROM leads
       WHERE dealership_id = $1
       AND assigned_user_id = $2`,
      [dealershipId, seller.id]
    );

    const totalLeads = parseInt(leadsResult.rows[0].count);

    // Visitas agendadas
    const visitsResult = await pool.query(
      `SELECT COUNT(*)
       FROM lead_ai_state s
       JOIN leads l ON l.id = s.lead_id
       WHERE l.dealership_id = $1
       AND l.assigned_user_id = $2
       AND s.stage = 'visit_scheduled'`,
      [dealershipId, seller.id]
    );

    const visits = parseInt(visitsResult.rows[0].count);

    // Meta
    const goalResult = await pool.query(
      `SELECT sales_target
       FROM monthly_goals
       WHERE dealership_id = $1
       AND user_id = $2
       AND month = $3
       AND year = $4`,
      [dealershipId, seller.id, month, year]
    );

    const target = goalResult.rows.length
      ? goalResult.rows[0].sales_target
      : 0;

    const metaPercent = target
      ? (totalSales / target) * 100
      : 0;

    /* =====================================================
       PONTUAÇÃO FINAL
    ===================================================== */

    let score = 0;

    score += totalSales * 20;
    score += visits * 10;
    score += metaPercent;
    score += totalLeads * 2;

    ranking.push({
      seller_id: seller.id,
      seller_name: seller.name,
      total_sales: totalSales,
      total_revenue: totalRevenue,
      total_leads: totalLeads,
      visits,
      meta_percent: Number(metaPercent.toFixed(1)),
      ranking_score: Number(score.toFixed(1))
    });
  }

  ranking.sort((a, b) => b.ranking_score - a.ranking_score);

  return ranking.map((seller, index) => ({
    position: index + 1,
    ...seller
  }));
}

module.exports = {
  calculateRanking
};
