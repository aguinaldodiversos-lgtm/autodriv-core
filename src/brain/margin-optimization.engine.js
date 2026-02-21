const db = require("../config/db")

class MarginOptimizationEngine {
  async calculate(tenantId) {
    const data = await db.query(
      `SELECT segment, AVG(price - cost) as margem
       FROM vehicles
       WHERE tenant_id = $1
       GROUP BY segment`,
      [tenantId]
    )

    return data.rows.map(r => ({
      segmento: r.segment,
      margemIdeal: Number(r.margem) * 1.1
    }))
  }
}

module.exports = MarginOptimizationEngine
