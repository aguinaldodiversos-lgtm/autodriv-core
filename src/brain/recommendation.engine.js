class RecommendationEngine {
  generate({ risco, estoqueCritico, piorCanal }) {
    const recomendacoes = []

    if (risco === "alto") {
      recomendacoes.push(
        "Reduzir estoque imediatamente para liberar capital."
      )
    }

    if (estoqueCritico.length > 0) {
      recomendacoes.push(
        "Baixar preço dos veículos parados há mais de 75 dias."
      )
    }

    if (piorCanal && piorCanal.roi < 0) {
      recomendacoes.push(
        `Reavaliar investimento no canal ${piorCanal.source}.`
      )
    }

    if (recomendacoes.length === 0) {
      recomendacoes.push(
        "Operação está saudável. Manter estratégia atual."
      )
    }

    return recomendacoes
  }
}

module.exports = RecommendationEngine
