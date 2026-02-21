// src/autonomous/growth/growth.engine.ts

export interface MarketData {
  demandIndex: number
  competitionIndex: number
  avgMargin: number
}

export class GrowthEngine {
  shouldExpand(data: MarketData) {
    const opportunityScore =
      data.demandIndex *
      data.avgMargin /
      (data.competitionIndex || 1)

    return opportunityScore > 1.5
  }

  recommendAction(data: MarketData) {
    if (this.shouldExpand(data)) {
      return "expand_market"
    }
    return "maintain_position"
  }
}
