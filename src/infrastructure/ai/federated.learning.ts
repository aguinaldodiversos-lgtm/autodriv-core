// src/infrastructure/ai/federated.learning.ts

export interface GradientUpdate {
  tenantId: string
  weights: number[]
}

export class FederatedLearning {
  private globalWeights: number[] = []

  aggregate(updates: GradientUpdate[]) {
    if (!updates.length) return

    const size = updates[0].weights.length
    const aggregated = new Array(size).fill(0)

    for (const update of updates) {
      for (let i = 0; i < size; i++) {
        aggregated[i] += update.weights[i]
      }
    }

    this.globalWeights = aggregated.map(
      w => w / updates.length
    )
  }

  getGlobalModel() {
    return this.globalWeights
  }
}
