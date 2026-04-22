// src/brain/conversion/seller.distribution.ts
// Distribui leads para vendedores com base em carga de trabalho e performance

export interface Seller {
  id:           string
  name:         string
  activeLeads:  number        // leads em aberto atualmente
  conversionRate: number      // 0–100
  avgResponseTime: number     // minutos
  isOnline:     boolean
}

export interface DistributionResult {
  assignedSellerId:   string
  assignedSellerName: string
  rationale:          string
  score:              number
}

export class SellerDistributionEngine {

  distribute(
    sellers: Seller[],
    maxActiveLeads: number = 15
  ): DistributionResult | null {

    const available = sellers.filter(s =>
      s.isOnline && s.activeLeads < maxActiveLeads
    )

    if (available.length === 0) {
      return null
    }

    // Pontuação: conversão alta + carga baixa + resposta rápida
    const scored = available.map(s => ({
      ...s,
      score: (
        (s.conversionRate          * 0.50) +
        ((maxActiveLeads - s.activeLeads) / maxActiveLeads * 100 * 0.30) +
        (Math.max(0, 100 - s.avgResponseTime) * 0.20)
      )
    }))

    const best = scored.sort((a, b) => b.score - a.score)[0]

    return {
      assignedSellerId:   best.id,
      assignedSellerName: best.name,
      score:              best.score,
      rationale:
        `Selecionado por: conversão ${best.conversionRate}% | ` +
        `leads ativos: ${best.activeLeads} | ` +
        `tempo de resposta: ${best.avgResponseTime}min`
    }
  }
}
