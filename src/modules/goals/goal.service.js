const pool = require("../../config/db");

/* =====================================================
   CRIAR OU ATUALIZAR META
===================================================== */
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

/* =====================================================
   CALCULAR PROGRESSO
===================================================== */
async function getGoalProgress(dealershipId, month, year) {

  const goals = await pool.query(
    `SELECT g.*, u.name
     FROM monthly_goals g
     JOIN users u ON u.id = g.user_id
     WHERE g.dealership_id = $1
       AND g.month = $2
       AND g.year = $3`,
    [dealershipId, month, year]
  );

  const results = [];

  for (const goal of goals.rows) {

    const salesResult = await pool.query(
      `SELECT COUNT(*) as total_sales,
              COALESCE(SUM(s.sale_price),0) as total_revenue
       FROM sales s
       WHERE s.dealership_id = $1
         AND s.user_id = $2
         AND EXTRACT(MONTH FROM s.created_at) = $3
         AND EXTRACT(YEAR FROM s.created_at) = $4`,
      [dealershipId, goal.user_id, month, year]
    );

    const totalSales = parseInt(salesResult.rows[0].total_sales);
    const totalRevenue = parseFloat(salesResult.rows[0].total_revenue);

    const salesPercent = goal.sales_target
      ? (totalSales / goal.sales_target) * 100
      : 0;

    const revenuePercent = goal.revenue_target
      ? (totalRevenue / goal.revenue_target) * 100
      : 0;

    const today = new Date();
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = today.getDate();

    const expectedProgress = (currentDay / daysInMonth) * 100;

    const status =
      salesPercent < expectedProgress - 15
        ? "below_pace"
        : salesPercent >= 100
        ? "achieved"
        : "on_track";

    results.push({
      user_id: goal.user_id,
      seller_name: goal.name,
      sales_target: goal.sales_target,
      revenue_target: goal.revenue_target,
      total_sales: totalSales,
      total_revenue: totalRevenue,
      sales_progress_percent: Number(salesPercent.toFixed(1)),
      revenue_progress_percent: Number(revenuePercent.toFixed(1)),
      status
    });
  }

  return results;
}

module.exports = {
  setMonthlyGoal,
  getGoalProgress
};
