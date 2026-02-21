// src/infrastructure/ai/economic.optimizer.ts

export class EconomicOptimizer {
  decideModel(
    estimatedMargin: number,
    premiumCost: number,
    probabilityOfConversion: number
  ) {
    const expectedGain =
      estimatedMargin * probabilityOfConversion

    if (expectedGain > premiumCost * 2) {
      return "premium"
    }

    return "local"
  }
}
