// src/brain/conversion/lead.core.ts
// Núcleo de inteligência de conversão de leads

export interface LeadConversionData {
  leadScore:    number   // 0–100
  visitScore:   number   // 0–100
  noShowRisk:   number   // 0–100 (quanto maior, maior o risco)
  saleScore:    number   // 0–100
  daysOpen?:    number   // dias desde a criação
}

export interface LeadConversionResult {
  unifiedScore: number
  stage:        "HOT" | "WARM" | "COLD" | "LOST"
  priority:     1 | 2 | 3 | 4 | 5
  action:       string
}

export class LeadIntelligenceCore {

  evaluate(data: LeadConversionData): number {

    const leadWeight       = data.leadScore  * 0.30
    const visitWeight      = data.visitScore * 0.30
    const attendanceWeight = (100 - data.noShowRisk) * 0.20
    const saleWeight       = data.saleScore  * 0.20

    return leadWeight + visitWeight + attendanceWeight + saleWeight
  }

  classify(data: LeadConversionData): LeadConversionResult {

    const unifiedScore = this.evaluate(data)

    const agingPenalty = data.daysOpen
      ? Math.min(data.daysOpen * 0.5, 20)
      : 0

    const adjustedScore = Math.max(unifiedScore - agingPenalty, 0)

    const stage: LeadConversionResult["stage"] =
      adjustedScore >= 75 ? "HOT"  :
      adjustedScore >= 50 ? "WARM" :
      adjustedScore >= 25 ? "COLD" : "LOST"

    const priority: LeadConversionResult["priority"] =
      stage === "HOT"  ? 1 :
      stage === "WARM" ? 2 :
      stage === "COLD" ? 4 : 5

    const action =
      stage === "HOT"  ? "Acionar imediatamente — agendar visita" :
      stage === "WARM" ? "Fazer follow-up em 24h" :
      stage === "COLD" ? "Enviar proposta personalizada e aguardar" :
                         "Requalificar ou arquivar"

    return { unifiedScore: adjustedScore, stage, priority, action }
  }
}
