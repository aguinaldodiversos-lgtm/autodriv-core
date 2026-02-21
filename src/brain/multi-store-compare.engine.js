const db = require("../config/db")

class MultiStoreCompareEngine {

  async compare() {

    const data = await db.query(
      `SELECT tenant_id,
              COUNT(*) as vendas,
              SUM(revenue) as receita
       FROM sales
       GROUP BY tenant_id`
    )

    return data.rows
      .map(r => ({
        tenantId: r.tenant_id,
        vendas: Number(r.vendas),
        receita: Number(r.receita)
      }))
      .sort((a,b)=>b.receita - a.receita)
  }
}

module.exports = MultiStoreCompareEngine
