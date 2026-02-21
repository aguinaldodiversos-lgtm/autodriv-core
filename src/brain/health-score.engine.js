const db = require("../config/db")

class HealthScoreEngine {
  async calculate(tenantId) {
    const vendas = await db.query(
      `SELECT COUNT(*) as total FROM sales WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [tenantId]
    )

    const estoque = await db.query(
      `SELECT COUNT(*) as total FROM vehicles WHERE tenant_id = $1 AND status = 'available'`,
      [tenantId]
    )

    const capital = await db.query(
      `SELECT SUM(cost) as total FROM vehicles WHERE tenant_id = $1 AND status = 'available'`,
      [tenantId]
    )

    const score =
      (Number(vendas.rows[0].total) * 0.4) +
      (Number(estoque.rows[0].total) * 0.2) -
      (Number(capital.rows[0].total || 0) / 100000 * 0.4)

    return {
      healthScore: Math.max(0, Math.min(100, score)),
      vendas: Number(vendas.rows[0].total),
      estoque: Number(estoque.rows[0].total),
      capitalTravado: Number(capital.rows[0].total || 0)
    }
  }
}

module.exports = HealthScoreEngine
