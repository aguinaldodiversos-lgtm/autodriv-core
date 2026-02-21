const db = require("../config/db")

class AttributionEngine {

  async calculate(tenantId) {

    const data = await db.query(
      `SELECT source, COUNT(*) as leads,
              SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as vendas
       FROM leads
       WHERE tenant_id = $1
       GROUP BY source`,
      [tenantId]
    )

    const totalVendas = data.rows.reduce(
      (sum, r) => sum + Number(r.vendas),
      0
    )

    return data.rows.map(r => {

      const weight = totalVendas > 0
        ? Number(r.vendas) / totalVendas
        : 0

      return {
        source: r.source,
        leads: Number(r.leads),
        vendas: Number(r.vendas),
        attributionScore: weight
      }
    })
  }
}

module.exports = AttributionEngine
