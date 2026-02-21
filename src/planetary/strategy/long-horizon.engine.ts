// src/planetary/strategy/long-horizon.engine.ts

export interface FutureScenario {
  probability: number
  growthPotential: number
  systemicRisk: number
}

export interface StrategicPlan {
  investmentBias: number
  reserveRatio: number
  diversificationIndex: number
}

export class LongHorizonStrategyEngine {
  generatePlan(
    scenarios: FutureScenario[]
  ): StrategicPlan {
    let expectedGrowth = 0
    let expectedRisk = 0

    for (const s of scenarios) {
      expectedGrowth += s.probability * s.growthPotential
      expectedRisk += s.probability * s.systemicRisk
    }

    return {
      investmentBias: expectedGrowth,
      reserveRatio: expectedRisk,
      diversificationIndex:
        1 - Math.abs(expectedGrowth - expectedRisk)
    }
  }
}
