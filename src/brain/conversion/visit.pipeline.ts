// src/brain/conversion/visit.pipeline.ts
// Pipeline de conversão: LEAD → VISITA → VENDA

import { LeadIntelligenceCore, LeadConversionData } from "./lead.core"
import { logger } from "@/infrastructure/logger/logger"

export type VisitStage =
  | "VISIT_SCHEDULED"
  | "VISIT_PROPOSED"
  | "CONTACTED"
  | "FOLLOW_UP_REQUIRED"

export interface VisitPipelineResult {
  stage:        VisitStage
  nextAction:   string
  urgency:      "immediate" | "today" | "this_week" | "monitor"
  score:        number
}

export class VisitPipelineEngine {

  private leadCore = new LeadIntelligenceCore()

  nextStage(leadData: Partial<LeadConversionData>): VisitPipelineResult {

    const data: LeadConversionData = {
      leadScore:  leadData.leadScore  ?? 50,
      visitScore: leadData.visitScore ?? 50,
      noShowRisk: leadData.noShowRisk ?? 30,
      saleScore:  leadData.saleScore  ?? 50,
      daysOpen:   leadData.daysOpen   ?? 0
    }

    const classification = this.leadCore.classify(data)
    const score = classification.unifiedScore

    logger.info(
      `🎯 Visit Pipeline | Score: ${score.toFixed(1)} | Stage: ${classification.stage}`
    )

    if (score > 75) {
      return {
        stage:      "VISIT_SCHEDULED",
        nextAction: "Confirmar visita com o cliente",
        urgency:    "immediate",
        score
      }
    }

    if (score > 50) {
      return {
        stage:      "VISIT_PROPOSED",
        nextAction: "Enviar convite de visita e aguardar confirmação",
        urgency:    "today",
        score
      }
    }

    if (score > 25) {
      return {
        stage:      "CONTACTED",
        nextAction: "Fazer contato qualificador e entender necessidade",
        urgency:    "this_week",
        score
      }
    }

    return {
      stage:      "FOLLOW_UP_REQUIRED",
      nextAction: "Reagendar follow-up ou reclassificar lead",
      urgency:    "monitor",
      score
    }
  }
}
