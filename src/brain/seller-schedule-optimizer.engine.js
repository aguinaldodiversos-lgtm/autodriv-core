// src/brain/seller-schedule-optimizer.engine.js

const db = require("../config/db")

class SellerScheduleOptimizer {

  async allocate(tenantId) {

    const sellers = await db.query(
      `SELECT seller_id,
              COUNT(*) FILTER (WHERE visit_completed = true) as visitas,
              COUNT(*) FILTER (WHERE status = 'sold') as vendas
       FROM leads
       WHERE tenant_id = $1
       GROUP BY seller_id`,
      [tenantId]
    )

    return sellers.rows
      .map(s => {
        const visitas = Number(s.visitas)
        const vendas = Number(s.vendas)

        return {
          sellerId: s.seller_id,
          taxaConversao:
            visitas > 0 ? vendas / visitas : 0
        }
      })
      .sort((a,b)=>b.taxaConversao - a.taxaConversao)
  }
}

module.exports = SellerScheduleOptimizer
