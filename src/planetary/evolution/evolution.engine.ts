// src/planetary/evolution/evolution.engine.ts

export interface CivilizationGenome {
  innovationRate: number
  cooperationBias: number
  riskTolerance: number
  expansionDrive: number
}

export interface CivilizationMetrics {
  economicOutput: number
  stabilityIndex: number
  conflictLevel: number
}

export class EvolutionaryAdaptationEngine {
  evolve(
    genome: CivilizationGenome,
    metrics: CivilizationMetrics
  ): CivilizationGenome {
    const next = { ...genome }

    if (metrics.economicOutput > 0.7) {
      next.innovationRate += 0.02
    }

    if (metrics.stabilityIndex < 0.5) {
      next.cooperationBias += 0.03
    }

    if (metrics.conflictLevel > 0.6) {
      next.riskTolerance -= 0.02
    }

    next.expansionDrive +=
      (metrics.economicOutput - 0.5) * 0.01

    return this.normalize(next)
  }

  private normalize(g: CivilizationGenome) {
    return {
      innovationRate: Math.min(Math.max(g.innovationRate, 0), 1),
      cooperationBias: Math.min(Math.max(g.cooperationBias, 0), 1),
      riskTolerance: Math.min(Math.max(g.riskTolerance, 0), 1),
      expansionDrive: Math.min(Math.max(g.expansionDrive, 0), 1)
    }
  }
}
