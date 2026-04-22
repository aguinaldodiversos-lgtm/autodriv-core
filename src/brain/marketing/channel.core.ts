// src/brain/marketing/channel.core.ts

export interface ChannelData {
  roi:        number   // Return on Investment (multiplicador)
  ltv:        number   // Lifetime Value em R$
  visitRate:  number   // Taxa de visitas (0-1)
  cac:        number   // Custo de Aquisição do Cliente em R$
}

export interface ChannelScore {
  raw:      ChannelData
  score:    number       // 0–100
  tier:     "A" | "B" | "C" | "D"
  action:   string
}

export class ChannelIntelligenceCore {

  evaluate(data: ChannelData): number {

    const roiScore   = Math.min(data.roi * 50,          100)
    const ltvScore   = Math.min(data.ltv / 1000,        100)
    const visitScore = Math.min(data.visitRate * 100,   100)
    const cacScore   = Math.max(100 - data.cac,           0)

    return (
      roiScore   * 0.40 +
      ltvScore   * 0.20 +
      visitScore * 0.20 +
      cacScore   * 0.20
    )
  }

  rank(data: ChannelData): ChannelScore {

    const score = this.evaluate(data)

    const tier =
      score >= 75 ? "A" :
      score >= 50 ? "B" :
      score >= 30 ? "C" : "D"

    const action =
      tier === "A" ? "Aumentar investimento" :
      tier === "B" ? "Manter e otimizar" :
      tier === "C" ? "Reduzir e monitorar" :
                     "Pausar campanha"

    return { raw: data, score, tier, action }
  }
}
