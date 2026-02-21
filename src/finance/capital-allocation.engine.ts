// src/finance/capital-allocation.engine.ts

export interface InvestmentOption {
  strategy: string
  expectedReturn: number
  risk: number
}

export class CapitalAllocationEngine {
  allocate(
    budget: number,
    options: InvestmentOption[]
  ) {
    const scored = options.map(o => ({
      ...o,
      score: o.expectedReturn / (o.risk || 1)
    }))

    scored.sort((a, b) => b.score - a.score)

    const allocation: Record<string, number> = {}
    let remaining = budget

    for (const opt of scored) {
      if (remaining <= 0) break
      const portion = remaining * 0.4
      allocation[opt.strategy] = portion
      remaining -= portion
    }

    return allocation
  }
}
