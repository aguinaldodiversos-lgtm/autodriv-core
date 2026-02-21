class CreativeSaturationEngine {

  evaluate({ ctrHistorico, ctrAtual, frequencia }) {

    let score = 0

    if (ctrAtual < ctrHistorico * 0.7)
      score += 40

    if (frequencia > 3)
      score += 30

    if (ctrAtual < 0.01)
      score += 30

    return {
      saturationScore: Math.min(100, score),
      precisaTrocarCriativo: score > 60
    }
  }
}

module.exports = CreativeSaturationEngine
