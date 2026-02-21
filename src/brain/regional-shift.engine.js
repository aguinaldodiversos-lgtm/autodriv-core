const db = require("../config/db")

class RegionalShiftEngine {

  async detect(tenantId) {

    const data = await db.query(
      `SELECT region,
              COUNT(*) as vendas,
              AVG(price) as ticket
       FROM sales
       WHERE tenant_id = $1
       AND created_at >= NOW() - INTERVAL '60 days'
       GROUP BY region`,
      [tenantId]
    )

    return data.rows.map(r => {

      const vendas = Number(r.vendas)

      return {
        region: r.region,
        alertaQueda: vendas < 5,
        ticketMedio: Number(r.ticket)
      }
    })
  }
}

module.exports = RegionalShiftEngine
