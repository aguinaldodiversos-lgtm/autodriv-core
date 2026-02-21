const FutureTurnoverEngine = require("./future-turnover.engine")

class PurchaseRecommendationEngine {
  constructor() {
    this.turnover = new FutureTurnoverEngine()
  }

  async recommend(tenantId) {
    const previsao = await this.turnover.forecast(tenantId)

    const recomendacoes = []

    Object.entries(previsao).forEach(([faixa, score]) => {
      if (score > 5) {
        recomendacoes.push(
          `Alta demanda prevista na faixa ${faixa}. Considerar compra estratégica.`
        )
      }
    })

    return recomendacoes
  }
}

module.exports = PurchaseRecommendationEngine
