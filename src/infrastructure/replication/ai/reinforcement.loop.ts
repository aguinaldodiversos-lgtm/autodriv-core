export interface ReinforcementSignal {
  decision: string
  reward: number
}

export class ReinforcementEngine {
  private policyWeights: Record<string, number> = {}

  applySignal(signal: ReinforcementSignal) {
    const current = this.policyWeights[signal.decision] || 0
    this.policyWeights[signal.decision] =
      current + signal.reward * 0.1
  }

  getBestDecision(options: string[]) {
    return options.sort(
      (a, b) =>
        (this.policyWeights[b] || 0) -
        (this.policyWeights[a] || 0)
    )[0]
  }
}
