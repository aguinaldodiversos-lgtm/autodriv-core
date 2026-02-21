class AudienceSaturationEngine {

  evaluate({ impressions, clicks, conversions }) {

    const ctr = impressions > 0 ? clicks / impressions : 0
    const taxaConversao = clicks > 0 ? conversions / clicks : 0

    let saturacao = 0

    if (ctr < 0.01) saturacao += 40
    if (taxaConversao < 0.02) saturacao += 40

    return {
      ctr,
      taxaConversao,
      saturacaoScore: Math.min(100, saturacao)
    }
  }
}

module.exports = AudienceSaturationEngine
