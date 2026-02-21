// src/autonomous/agents/base.agent.ts

export interface EconomicContext {
  budget: number
  objective: string
  marketSignal: number
}

export abstract class BaseAgent {
  protected balance = 0

  constructor(
    protected name: string,
    protected context: EconomicContext
  ) {}

  abstract act(): Promise<number>

  receive(amount: number) {
    this.balance += amount
  }

  spend(amount: number) {
    if (this.balance < amount) {
      throw new Error(`${this.name} insufficient balance`)
    }
    this.balance -= amount
  }

  getBalance() {
    return this.balance
  }
}
