const db = require("../config/db")

class RegionalOptimizerEngine {

  async optimize(tenantId) {

    const data = await db.query(
      `SELECT region,
              COUNT(*) as vendas
       FROM sales
       WHERE tenant_id = $1
       GROUP BY region`,
      [tenantId]
    )

    const total = data.rows.reduce(
      (sum, r)=> sum + Number(r.vendas), 0
    )

    return data.rows.map(r => ({
      region: r.region,
      suggestedBudgetWeight:
        total > 0
          ? Number(r.vendas)/total
          : 0
    }))
  }
}

module.exports = RegionalOptimizerEngine
