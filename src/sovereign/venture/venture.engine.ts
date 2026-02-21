// src/sovereign/venture/venture.engine.ts

export interface VentureOpportunity {
  marketScore: number
  techAdvantage: number
  capitalRequired: number
}

export class VentureCreationEngine {
  evaluate(op: VentureOpportunity) {
    const score =
      op.marketScore *
      op.techAdvantage /
      (op.capitalRequired || 1)

    return score > 2
  }

  createVenture(op: VentureOpportunity) {
    if (!this.evaluate(op)) {
      return null
    }

    return {
      ventureId: crypto.randomUUID(),
      focus: "new_market_unit",
      createdAt: new Date()
    }
  }
}
