const pool = require("../../config/db");

async function calculateRanking(dealershipId, month, year) {
  const { rows } = await pool.query(
    `WITH sales_month AS (
       SELECT user_id,
              COUNT(*)::int AS total_sales,
              COALESCE(SUM(price), 0)::numeric AS total_revenue
       FROM sales
       WHERE dealership_id = $1
         AND EXTRACT(MONTH FROM created_at) = $2
         AND EXTRACT(YEAR FROM created_at) = $3
       GROUP BY user_id
     ),
     leads_by_seller AS (
       SELECT assigned_user_id AS user_id,
              COUNT(*)::int AS total_leads
       FROM leads
       WHERE dealership_id = $1
         AND assigned_user_id IS NOT NULL
       GROUP BY assigned_user_id
     ),
     visits_by_seller AS (
       SELECT l.assigned_user_id AS user_id,
              COUNT(*)::int AS visits
       FROM leads l
       JOIN lead_ai_state s ON s.lead_id = l.id
       WHERE l.dealership_id = $1
         AND l.assigned_user_id IS NOT NULL
         AND s.stage = 'visit_scheduled'
       GROUP BY l.assigned_user_id
     ),
     goals AS (
       SELECT user_id,
              sales_target
       FROM monthly_goals
       WHERE dealership_id = $1
         AND month = $2
         AND year = $3
     )
     SELECT u.id,
            u.name,
            COALESCE(sm.total_sales, 0)::int AS total_sales,
            COALESCE(sm.total_revenue, 0)::numeric AS total_revenue,
            COALESCE(lb.total_leads, 0)::int AS total_leads,
            COALESCE(vb.visits, 0)::int AS visits,
            COALESCE(g.sales_target, 0)::numeric AS sales_target
     FROM users u
     LEFT JOIN sales_month sm ON sm.user_id = u.id
     LEFT JOIN leads_by_seller lb ON lb.user_id = u.id
     LEFT JOIN visits_by_seller vb ON vb.user_id = u.id
     LEFT JOIN goals g ON g.user_id = u.id
     WHERE u.dealership_id = $1
       AND u.role = 'seller'`,
    [dealershipId, month, year]
  );

  const ranking = rows.map((seller) => {
    const totalSales = Number(seller.total_sales || 0);
    const totalRevenue = Number(seller.total_revenue || 0);
    const totalLeads = Number(seller.total_leads || 0);
    const visits = Number(seller.visits || 0);
    const target = Number(seller.sales_target || 0);
    const metaPercent = target ? (totalSales / target) * 100 : 0;
    const score =
      totalSales * 20 +
      visits * 10 +
      metaPercent +
      totalLeads * 2;

    return {
      seller_id: seller.id,
      seller_name: seller.name,
      total_sales: totalSales,
      total_revenue: totalRevenue,
      total_leads: totalLeads,
      visits,
      meta_percent: Number(metaPercent.toFixed(1)),
      ranking_score: Number(score.toFixed(1))
    };
  });

  ranking.sort((a, b) => b.ranking_score - a.ranking_score);

  return ranking.map((seller, index) => ({
    position: index + 1,
    ...seller
  }));
}

module.exports = {
  calculateRanking
};
