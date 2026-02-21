const db = require("../config/db")

class ChannelLTVEngine {

  async calculate(tenantId) {

    const data = await db.query(
      `SELECT source,
              SUM(revenue) as receita,
              COUNT(*) as vendas
       FROM sales
       WHERE tenant_id = $1
       GROUP BY source`,
      [tenantId]
    )

    return data.rows.map(r => ({
      source: r.source,
      ltvMedio:
        Number(r.vendas) > 0
          ? Number(r.receita) / Number(r.vendas)
          : 0
    }))
  }
}

module.exports = ChannelLTVEngine
