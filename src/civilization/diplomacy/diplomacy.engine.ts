// src/civilization/diplomacy/diplomacy.engine.ts

export interface DiplomaticSignal {
  from: string
  to: string
  trustScore: number
  economicInterdependence: number
  conflictRisk: number
}

export interface DiplomaticOutcome {
  agreementType: "alliance" | "trade" | "neutral" | "sanction"
  stabilityImpact: number
}

export class InterAIDiplomacyEngine {
  evaluate(signal: DiplomaticSignal): DiplomaticOutcome {
    const cooperationScore =
      signal.trustScore * 0.4 +
      signal.economicInterdependence * 0.4 -
      signal.conflictRisk * 0.2

    if (cooperationScore > 0.7) {
      return { agreementType: "alliance", stabilityImpact: 0.3 }
    }

    if (cooperationScore > 0.4) {
      return { agreementType: "trade", stabilityImpact: 0.15 }
    }

    if (signal.conflictRisk > 0.6) {
      return { agreementType: "sanction", stabilityImpact: -0.3 }
    }

    return { agreementType: "neutral", stabilityImpact: 0 }
  }
}
