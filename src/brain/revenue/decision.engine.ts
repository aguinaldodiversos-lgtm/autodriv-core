// src/brain/revenue/decision.engine.ts

import { RevenueIntelligenceCore, RevenueInput } from "./revenue.core"

export interface DecisionResult {
  adjustBudget?: boolean
  reducePrice?: boolean
  prioritizeLeads?: boolean
  liquidateStock?: boolean
  usePremiumAI?: boolean
  confidence: number
  rationale: string[]
}

export class DecisionEngine {

  constructor(
    private revenueCore: RevenueIntelligenceCore
  ) {}

  async evaluate(input: Partial<RevenueInput>): Promise<DecisionResult> {

    const result = this.revenueCore.evaluateSystem(input)
    const decisions: DecisionResult = {
      confidence: result.globalHealth,
      rationale: result.recommendations
    }

    if (result.channelScore < 50)
      decisions.adjustBudget = true

    if (result.vehicleScore < 40)
      decisions.reducePrice = true

    if (result.leadScore < 60)
      decisions.prioritizeLeads = true

    if (result.vehicleScore < 30)
      decisions.liquidateStock = true

    if (result.globalHealth < 40)
      decisions.usePremiumAI = true

    return decisions
  }
}
