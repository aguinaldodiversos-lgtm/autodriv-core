const pool = require("../../config/db");

const entrySelect = `
  SELECT
    f.*,
    v.title AS vehicle_title,
    v.brand AS vehicle_brand,
    v.model AS vehicle_model,
    s.price AS sale_price
  FROM finance_entries f
  LEFT JOIN vehicles v ON v.id = f.vehicle_id
  LEFT JOIN sales s ON s.id = f.related_sale_id
`;

async function create(data) {
  const result = await pool.query(
    `INSERT INTO finance_entries
     (dealership_id, type, category, description, amount, due_date, paid_date,
      status, vehicle_id, related_sale_id, notes, paid_by, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
     RETURNING *`,
    [
      data.dealership_id,
      data.type,
      data.category,
      data.description,
      data.amount,
      data.due_date,
      data.paid_date,
      data.status,
      data.vehicle_id,
      data.related_sale_id,
      data.notes,
      data.paid_by
    ]
  );

  return result.rows[0];
}

async function findAll(dealershipId) {
  const result = await pool.query(
    `${entrySelect}
     WHERE f.dealership_id = $1
     ORDER BY
       CASE WHEN f.status = 'pending' THEN 0 ELSE 1 END,
       f.due_date ASC NULLS LAST,
       f.created_at DESC
     LIMIT 500`,
    [dealershipId]
  );

  return result.rows;
}

async function markAsPaid(id, dealershipId, userId) {
  const result = await pool.query(
    `UPDATE finance_entries
     SET status = 'paid',
         paid_date = COALESCE(paid_date, CURRENT_DATE),
         paid_by = COALESCE(paid_by, $3),
         updated_at = NOW()
     WHERE id = $1 AND dealership_id = $2
     RETURNING *`,
    [id, dealershipId, userId || null]
  );

  return result.rows[0];
}

async function getSummary(dealershipId) {
  const [totals, categoryRows, vehicleRows] = await Promise.all([
    pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END), 0) AS paid_income,
        COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount ELSE 0 END), 0) AS paid_expense,
        COALESCE(SUM(CASE WHEN type = 'income' AND status = 'pending' THEN amount ELSE 0 END), 0) AS pending_income,
        COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'pending' THEN amount ELSE 0 END), 0) AS pending_expense,
        COALESCE(SUM(CASE WHEN type = 'income' AND status = 'paid' AND paid_date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) AS month_income,
        COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'paid' AND paid_date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) AS month_expense,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE) AS overdue_count,
        COALESCE(SUM(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN amount ELSE 0 END), 0) AS overdue_amount
      FROM finance_entries
      WHERE dealership_id = $1
      `,
      [dealershipId]
    ),
    pool.query(
      `
      SELECT
        COALESCE(category, 'Sem categoria') AS category,
        type,
        COALESCE(SUM(amount), 0) AS total,
        COUNT(*) AS count
      FROM finance_entries
      WHERE dealership_id = $1
      GROUP BY COALESCE(category, 'Sem categoria'), type
      ORDER BY total DESC
      LIMIT 12
      `,
      [dealershipId]
    ),
    pool.query(
      `
      SELECT
        v.id,
        v.title,
        v.brand,
        v.model,
        v.year,
        v.price,
        v.purchase_price,
        v.acquisition_cost,
        v.preparation_cost_actual,
        COALESCE(SUM(CASE WHEN f.type = 'expense' THEN f.amount ELSE 0 END), 0) AS finance_expense,
        COALESCE(SUM(CASE WHEN f.type = 'income' THEN f.amount ELSE 0 END), 0) AS finance_income
      FROM vehicles v
      LEFT JOIN finance_entries f ON f.vehicle_id = v.id
      WHERE v.dealership_id = $1
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT 100
      `,
      [dealershipId]
    )
  ]);

  const row = totals.rows[0] || {};
  const paidIncome = Number(row.paid_income || 0);
  const paidExpense = Number(row.paid_expense || 0);
  const pendingIncome = Number(row.pending_income || 0);
  const pendingExpense = Number(row.pending_expense || 0);

  return {
    paid_income: paidIncome,
    paid_expense: paidExpense,
    pending_income: pendingIncome,
    pending_expense: pendingExpense,
    month_income: Number(row.month_income || 0),
    month_expense: Number(row.month_expense || 0),
    overdue_count: Number(row.overdue_count || 0),
    overdue_amount: Number(row.overdue_amount || 0),
    current_balance: paidIncome - paidExpense,
    projected_balance: paidIncome + pendingIncome - paidExpense - pendingExpense,
    by_category: categoryRows.rows,
    vehicle_profitability: vehicleRows.rows.map((vehicle) => {
      const price = Number(vehicle.price || 0);
      const purchase = Number(vehicle.purchase_price || 0);
      const acquisition = Number(vehicle.acquisition_cost || 0);
      const preparation = Number(vehicle.preparation_cost_actual || 0);
      const financeExpense = Number(vehicle.finance_expense || 0);
      const financeIncome = Number(vehicle.finance_income || 0);
      const totalCost = purchase + acquisition + preparation + financeExpense;
      const expectedIncome = financeIncome || price;

      return {
        ...vehicle,
        total_cost: totalCost,
        expected_income: expectedIncome,
        expected_margin: expectedIncome - totalCost
      };
    })
  };
}

module.exports = {
  create,
  findAll,
  markAsPaid,
  getSummary
};
