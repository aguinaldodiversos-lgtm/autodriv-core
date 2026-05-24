const pool = require("../../config/db");

async function calculateCommission(dealershipId, month, year) {
  const settingsResult = await pool.query(
    `SELECT *
     FROM commission_settings
     WHERE dealership_id = $1
     LIMIT 1`,
    [dealershipId]
  );

  const settings = settingsResult.rows.length
    ? settingsResult.rows[0]
    : { base_percent: 2, bonus_percent: 1 };

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
            COALESCE(g.sales_target, 0)::numeric AS sales_target
     FROM users u
     LEFT JOIN sales_month sm ON sm.user_id = u.id
     LEFT JOIN goals g ON g.user_id = u.id
     WHERE u.dealership_id = $1
       AND u.role = 'seller'`,
    [dealershipId, month, year]
  );

  return rows.map((seller) => {
    const totalSales = Number(seller.total_sales || 0);
    const totalRevenue = Number(seller.total_revenue || 0);
    const target = Number(seller.sales_target || 0);
    const achieved = target > 0 && totalSales >= target;
    let commission = totalRevenue * (Number(settings.base_percent) / 100);

    if (achieved) {
      commission += totalRevenue * (Number(settings.bonus_percent) / 100);
    }

    return {
      seller_id: seller.id,
      seller_name: seller.name,
      total_sales: totalSales,
      total_revenue: totalRevenue,
      achieved_goal: achieved,
      commission_value: Number(commission.toFixed(2))
    };
  });
}

module.exports = {
  calculateCommission
};
