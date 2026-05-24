const pool = require("../../config/db");

async function setMonthlyGoal(data, dealershipId) {
  const { user_id, sales_target, revenue_target, month, year } = data;

  await pool.query(
    `INSERT INTO monthly_goals
     (dealership_id, user_id, month, year, sales_target, revenue_target)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (dealership_id, user_id, month, year)
     DO UPDATE SET
       sales_target = $5,
       revenue_target = $6`,
    [dealershipId, user_id, month, year, sales_target, revenue_target]
  );

  return { success: true };
}

async function getGoalProgress(dealershipId, month, year) {
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
     )
     SELECT g.user_id,
            u.name,
            g.sales_target,
            g.revenue_target,
            COALESCE(sm.total_sales, 0)::int AS total_sales,
            COALESCE(sm.total_revenue, 0)::numeric AS total_revenue
     FROM monthly_goals g
     JOIN users u ON u.id = g.user_id
     LEFT JOIN sales_month sm ON sm.user_id = g.user_id
     WHERE g.dealership_id = $1
       AND g.month = $2
       AND g.year = $3`,
    [dealershipId, month, year]
  );

  const today = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const expectedProgress = (today.getDate() / daysInMonth) * 100;

  return rows.map((goal) => {
    const totalSales = Number(goal.total_sales || 0);
    const totalRevenue = Number(goal.total_revenue || 0);
    const salesTarget = Number(goal.sales_target || 0);
    const revenueTarget = Number(goal.revenue_target || 0);
    const salesPercent = salesTarget ? (totalSales / salesTarget) * 100 : 0;
    const revenuePercent = revenueTarget ? (totalRevenue / revenueTarget) * 100 : 0;
    const status =
      salesPercent < expectedProgress - 15
        ? "below_pace"
        : salesPercent >= 100
          ? "achieved"
          : "on_track";

    return {
      user_id: goal.user_id,
      seller_name: goal.name,
      sales_target: goal.sales_target,
      revenue_target: goal.revenue_target,
      total_sales: totalSales,
      total_revenue: totalRevenue,
      sales_progress_percent: Number(salesPercent.toFixed(1)),
      revenue_progress_percent: Number(revenuePercent.toFixed(1)),
      status
    };
  });
}

module.exports = {
  setMonthlyGoal,
  getGoalProgress
};
