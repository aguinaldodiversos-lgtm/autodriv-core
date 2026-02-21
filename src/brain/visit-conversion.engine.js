const db = require("../config/db")

class VisitConversionEngine {

  async analyze(tenantId) {

    const data = await db.query(
      `SELECT source,
              COUNT(*) as leads,
              SUM(CASE WHEN visit_scheduled = true THEN 1 ELSE 0 END) as visitas,
              SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as vendas
       FROM leads
       WHERE tenant_id = $1
       GROUP BY source`,
      [tenantId]
    )

    return data.rows.map(r => {

      const leads = Number(r.leads)
      const visitas = Number(r.visitas)

      const taxaVisita =
        leads > 0 ? visitas / leads : 0

      return {
        source: r.source,
        leads,
        visitas,
        taxaVisita
      }
    })
  }
}

module.exports = VisitConversionEngine
