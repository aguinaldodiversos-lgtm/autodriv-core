const db = require("../config/db")

class MarketingIntelligenceEngine {

  async analyze(tenantId) {

    const campanhas = await db.query(
      `SELECT campaign, source,
              SUM(cost) as investimento,
              SUM(leads) as leads,
              SUM(sales) as vendas,
              SUM(revenue) as receita
       FROM marketing_campaigns
       WHERE tenant_id = $1
       GROUP BY campaign, source`,
      [tenantId]
    )

    const resultado = campanhas.rows.map(c => {

      const investimento = Number(c.investimento || 0)
      const leads = Number(c.leads || 0)
      const vendas = Number(c.vendas || 0)
      const receita = Number(c.receita || 0)

      const roi = investimento > 0
        ? (receita - investimento) / investimento
        : 0

      const cac = vendas > 0
        ? investimento / vendas
        : investimento

      const ltv = vendas > 0
        ? receita / vendas
        : 0

      return {
        campaign: c.campaign,
        source: c.source,
        investimento,
        leads,
        vendas,
        receita,
        roi,
        cac,
        ltv
      }
    })

    return resultado
  }
}

module.exports = MarketingIntelligenceEngine
