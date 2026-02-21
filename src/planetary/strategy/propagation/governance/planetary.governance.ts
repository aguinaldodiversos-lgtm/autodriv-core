// src/planetary/governance/planetary.governance.ts

export interface GovernanceLayer {
  level: "local" | "regional" | "global"
  authorityWeight: number
}

export interface GovernanceDecision {
  impact: number
  risk: number
}

export class PlanetaryGovernance {
  private layers: GovernanceLayer[] = []

  registerLayer(layer: GovernanceLayer) {
    this.layers.push(layer)
  }

  evaluate(decision: GovernanceDecision) {
    const totalWeight = this.layers.reduce(
      (sum, l) => sum + l.authorityWeight,
      0
    )

    const governanceScore =
      (decision.impact - decision.risk) *
      (totalWeight || 1)

    if (governanceScore < 0) {
      throw new Error("Planetary governance veto")
    }

    return governanceScore
  }
}
