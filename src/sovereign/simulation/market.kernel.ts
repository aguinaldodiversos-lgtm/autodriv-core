// src/sovereign/simulation/market.kernel.ts

export interface AgentState {
  capital: number
  strategyBias: number
}

export class MarketSimulationKernel {
  private agents: AgentState[] = []

  register(agent: AgentState) {
    this.agents.push(agent)
  }

  simulateRound() {
    for (const agent of this.agents) {
      const performance =
        agent.capital *
        (0.8 + Math.random() * 0.4) *
        agent.strategyBias

      agent.capital = performance
    }

    return this.agents
  }

  runSimulation(rounds: number) {
    for (let i = 0; i < rounds; i++) {
      this.simulateRound()
    }

    return this.agents
  }
}
