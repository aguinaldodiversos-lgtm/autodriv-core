// src/infrastructure/policy/evolving-policy.engine.ts

export class EvolvingPolicyEngine {
  private weights: Record<string, number> = {}

  evaluate(option: string) {
    return this.weights[option] || 0
  }

  reinforce(option: string, reward: number) {
    const current = this.weights[option] || 0
    this.weights[option] = current + reward * 0.05
  }

  bestOption(options: string[]) {
    return options.sort(
      (a, b) =>
        (this.weights[b] || 0) -
        (this.weights[a] || 0)
    )[0]
  }
}
