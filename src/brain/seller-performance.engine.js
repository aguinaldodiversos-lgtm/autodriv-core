const db = require("../config/db")

class SellerPerformanceEngine {
  async detect(tenantId) {
    const vendedores = await db.query(
      `SELECT seller_id,
              COUNT(*) as vendas
       FROM sales
       WHERE tenant_id = $1
       AND created_at >= NOW() - INTERVAL '60 days'
       GROUP BY seller_id`,
      [tenantId]
    )

    return vendedores.rows
      .filter(v => Number(v.vendas) < 3)
      .map(v => v.seller_id)
  }
}

module.exports = SellerPerformanceEngine
