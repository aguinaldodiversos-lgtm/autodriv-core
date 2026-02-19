const pool = require("../../config/db");

async function calculateCommission(dealershipId, month, year) {

  const settingsResult = await pool.query(
    `SELECT * FROM commission_settings
     WHERE dealership_id = $1
     LIMIT 1`,
    [dealershipId]
  );

  const settings = settingsResult.rows.length
    ? settingsResult.rows[0]
    : { base_percent: 2, bonus_percent: 1 };

  const sellers = await pool.query(
    `SELECT id, name
     FROM users
     WHERE dealership_id = $1
     AND role = 'seller'`,
    [dealershipId]
  );

  const results = [];

  for (const seller of sellers.rows) {

    const sales = await pool.query(
      `SELECT COUNT(*) as total_sales,
              COALESCE(SUM(sale_price),0) as total_revenue
       FROM sales
       WHERE dealership_id = $1
       AND user_id = $2
       AND EXTRACT(MONTH FROM created_at) = $3
       AND EXTRACT(YEAR FROM created_at) = $4`,
      [dealershipId, seller.id, month, year]
    );

    const totalSales = parseInt(sales.rows[0].total_sales);
    const totalRevenue = parseFloat(sales.rows[0].total_revenue);

    const goal = await pool.query(
      `SELECT sales_target
       FROM monthly_goals
       WHERE dealership_id = $1
       AND user_id = $2
       AND month = $3
       AND year = $4`,
      [dealershipId, seller.id, month, year]
    );

    const target = goal.rows.length
      ? goal.rows[0].sales_target
      : 0;

    const achieved = target > 0 && totalSales >= target;

    let commission = totalRevenue * (settings.base_percent / 100);

    if (achieved) {
      commission += totalRevenue * (settings.bonus_percent / 100);
    }

    results.push({
      seller_id: seller.id,
      seller_name: seller.name,
      total_sales: totalSales,
      total_revenue: totalRevenue,
      achieved_goal: achieved,
      commission_value: Number(commission.toFixed(2))
    });
  }

  return results;
}

module.exports = {
  calculateCommission
};
