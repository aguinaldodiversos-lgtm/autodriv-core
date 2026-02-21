// src/infrastructure/finance/autonomous.optimizer.ts

export interface Scenario {
  cost: number
  revenue: number
  probability: number
}

export class FinancialOptimizer {
  selectBest(scenarios: Scenario[]) {
    return scenarios.sort(
      (a, b) =>
        b.revenue * b.probability - b.cost -
        (a.revenue * a.probability - a.cost)
    )[0]
  }
}
