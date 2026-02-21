// src/cosmology/projection/reality.selection.ts

export interface RealityState {
  id: string
  probability: number
  survivalScore: number
  expansionPotential: number
}

export class AutonomousRealitySelector {
  select(realities: RealityState[]) {
    let best = realities[0]
    let bestScore = -Infinity

    for (const r of realities) {
      const score =
        r.probability *
        (r.survivalScore + r.expansionPotential)

      if (score > bestScore) {
        bestScore = score
        best = r
      }
    }

    return {
      selectedReality: best.id,
      confidence: bestScore
    }
  }
}
