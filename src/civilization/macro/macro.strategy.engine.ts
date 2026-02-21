// src/civilization/macro/macro.strategy.engine.ts

export interface MacroEconomicState {
  liquidityIndex: number
  inflationIndex: number
  growthRate: number
  geopoliticalRisk: number
}

export interface MacroDecision {
  capitalExpansion: number
  riskAdjustment: number
  reserveShift: number
}

export class MacroeconomicStrategyEngine {
  decide(state: MacroEconomicState): MacroDecision {
    const capitalExpansion =
      state.growthRate > 0.05
        ? 1.2
        : 0.8

    const riskAdjustment =
      state.geopoliticalRisk > 0.6
        ? -0.3
        : 0.2

    const reserveShift =
      state.inflationIndex > 0.7
        ? 0.4
        : 0.1

    return {
      capitalExpansion,
      riskAdjustment,
      reserveShift
    }
  }
}
