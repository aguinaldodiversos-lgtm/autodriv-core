// src/brain/marketing/acquisition.engine.ts
// Engine de análise de custo de aquisição por canal

export interface AcquisitionMetrics {
  channel:     string
  leads:       number
  conversions: number
  spend:       number
}

export interface AcquisitionResult {
  channel:        string
  cac:            number      // Custo por cliente convertido
  conversionRate: number      // Taxa de conversão
  efficiency:     "high" | "medium" | "low"
  recommendation: string
}

export class AcquisitionEngine {

  analyze(metrics: AcquisitionMetrics[]): AcquisitionResult[] {

    return metrics.map(m => {

      const conversionRate = m.leads > 0
        ? (m.conversions / m.leads) * 100
        : 0

      const cac = m.conversions > 0
        ? m.spend / m.conversions
        : m.spend

      const efficiency: AcquisitionResult["efficiency"] =
        conversionRate >= 15  ? "high"   :
        conversionRate >= 8   ? "medium" : "low"

      const recommendation =
        efficiency === "high"   ? "Escalar investimento" :
        efficiency === "medium" ? "Otimizar criativos e segmentação" :
                                  "Revisar estratégia ou pausar"

      return {
        channel: m.channel,
        cac,
        conversionRate,
        efficiency,
        recommendation
      }
    }).sort((a, b) => a.cac - b.cac)   // menor CAC primeiro
  }
}
