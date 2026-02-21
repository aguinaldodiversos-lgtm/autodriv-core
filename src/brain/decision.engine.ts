import { RevenueIntelligenceCore } from "./revenue-intelligence.core"

export interface DecisionResult {
  adjustBudget?: boolean
  reducePrice?: boolean
  prioritizeLeads?: boolean
  liquidateStock?: boolean
}

export class DecisionEngine {

  constructor(
    private revenueCore: RevenueIntelligenceCore
  ) {}

  async evaluate(input: any): Promise<DecisionResult> {

    const result =
      await this.revenueCore.evaluateSystem(input)

    const decisions: DecisionResult = {}

    if (result.channelScore < 50)
      decisions.adjustBudget = true

    if (result.vehicleScore < 40)
      decisions.reducePrice = true

    if (result.leadScore < 60)
      decisions.prioritizeLeads = true

    if (result.vehicleScore < 30)
      decisions.liquidateStock = true

    return decisions
  }
}
