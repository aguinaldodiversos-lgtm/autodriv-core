// src/brain/revenue/revenue.core.ts

export interface RevenueInput {
  vehicleScore: number
  leadScore: number
  channelScore: number
}

export interface RevenueOutput extends RevenueInput {
  globalHealth: number
  status: "critical" | "warning" | "healthy" | "excellent"
  recommendations: string[]
}

export class RevenueIntelligenceCore {

  evaluateSystem(input: Partial<RevenueInput> = {}): RevenueOutput {

    const vehicleScore  = input.vehicleScore  ?? 50
    const leadScore     = input.leadScore     ?? 50
    const channelScore  = input.channelScore  ?? 50

    const globalHealth =
      (vehicleScore * 0.4) +
      (leadScore   * 0.3) +
      (channelScore * 0.3)

    const status = this.classifyHealth(globalHealth)
    const recommendations = this.generateRecommendations(
      vehicleScore, leadScore, channelScore, globalHealth
    )

    return {
      vehicleScore,
      leadScore,
      channelScore,
      globalHealth,
      status,
      recommendations
    }
  }

  private classifyHealth(score: number): RevenueOutput["status"] {
    if (score >= 80) return "excellent"
    if (score >= 60) return "healthy"
    if (score >= 40) return "warning"
    return "critical"
  }

  private generateRecommendations(
    vehicleScore: number,
    leadScore: number,
    channelScore: number,
    globalHealth: number
  ): string[] {
    const recs: string[] = []

    if (channelScore < 50)
      recs.push("Revisar investimento em canais de marketing — ROI abaixo do esperado")

    if (vehicleScore < 40)
      recs.push("Ajustar precificação do estoque — veículos parados há muito tempo")

    if (leadScore < 60)
      recs.push("Priorizar qualificação de leads — taxa de conversão baixa")

    if (vehicleScore < 30)
      recs.push("Ação urgente: desova de estoque necessária — capital imobilizado alto")

    if (globalHealth >= 80)
      recs.push("Sistema saudável — manter estratégia atual")

    return recs
  }
}
