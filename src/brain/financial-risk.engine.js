const db = require("../config/db")

class FinancialRiskEngine {
  async analyze(tenantId) {
    const capital = await db.query(
      `SELECT SUM(COALESCE(price, 0)) as total FROM vehicles WHERE dealership_id = $1 AND status = 'available'`,
      [tenantId]
    )

    const vendas = await db.query(
      `SELECT COUNT(*) as total FROM sales WHERE dealership_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [tenantId]
    )

    const capitalTravado = Number(capital.rows[0].total || 0)
    const vendasMensais = Number(vendas.rows[0].total)

    const risco =
      capitalTravado > vendasMensais * 80000
        ? "alto"
        : capitalTravado > vendasMensais * 50000
        ? "moderado"
        : "baixo"

    return { capitalTravado, vendasMensais, risco }
  }
}

module.exports = FinancialRiskEngine
