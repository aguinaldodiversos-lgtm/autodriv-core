// src/sovereign/geopolitics/geopolitical.engine.ts

export interface GeopoliticalSignal {
  country: string
  stabilityIndex: number     // 0-1
  regulationStrictness: number // 0-1
  tradeFreedom: number       // 0-1
}

export interface AdaptationDecision {
  country: string
  riskLevel: "low" | "medium" | "high"
  action: string
}

export class GeopoliticalAdaptationEngine {
  evaluate(signal: GeopoliticalSignal): AdaptationDecision {
    const riskScore =
      (1 - signal.stabilityIndex) * 0.5 +
      signal.regulationStrictness * 0.3 +
      (1 - signal.tradeFreedom) * 0.2

    if (riskScore > 0.7) {
      return {
        country: signal.country,
        riskLevel: "high",
        action: "reduce_exposure"
      }
    }

    if (riskScore > 0.4) {
      return {
        country: signal.country,
        riskLevel: "medium",
        action: "hedge_and_monitor"
      }
    }

    return {
      country: signal.country,
      riskLevel: "low",
      action: "expand_presence"
    }
  }
}
