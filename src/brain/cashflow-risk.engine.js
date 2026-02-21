// src/brain/cashflow-risk.engine.js

const db = require("../config/db")

class CashflowRiskEngine {
  async calculate(tenantId) {
    const capital = await db.query(
      `SELECT SUM(cost) as total FROM vehicles WHERE tenant_id = $1 AND status = 'available'`,
      [tenantId]
    )

    const vendas = await db.query(
      `SELECT COUNT(*) as total FROM sales WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [tenantId]
    )

    const despesas = await db.query(
      `SELECT SUM(amount) as total FROM finance WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [tenantId]
    )

    const capitalTravado = Number(capital.rows[0].total || 0)
    const vendasMensais = Number(vendas.rows[0].total)
    const despesasMensais = Number(despesas.rows[0].total || 0)

    const caixaProjetado = (vendasMensais * 8000) - despesasMensais

    let riscoScore = 100

    if (caixaProjetado < 0) riscoScore -= 40
    if (capitalTravado > vendasMensais * 90000) riscoScore -= 30
    if (vendasMensais < 5) riscoScore -= 20

    return {
      caixaProjetado,
      riscoQuebraScore: Math.max(0, riscoScore)
    }
  }
}

module.exports = CashflowRiskEngine
