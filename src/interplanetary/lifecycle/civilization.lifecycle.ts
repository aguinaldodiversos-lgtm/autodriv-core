// src/interplanetary/lifecycle/civilization.lifecycle.ts

export type CivilizationStage =
  | "emergence"
  | "growth"
  | "maturity"
  | "transformation"

export interface LifecycleMetrics {
  expansionRate: number
  stabilityIndex: number
  innovationIndex: number
}

export class CivilizationLifecycleManager {
  determineStage(
    metrics: LifecycleMetrics
  ): CivilizationStage {
    if (metrics.expansionRate < 0.3)
      return "emergence"

    if (metrics.expansionRate < 0.7)
      return "growth"

    if (
      metrics.stabilityIndex > 0.7 &&
      metrics.innovationIndex > 0.6
    )
      return "maturity"

    return "transformation"
  }
}
