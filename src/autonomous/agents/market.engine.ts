// src/autonomous/agents/market.engine.ts

import { BaseAgent } from "./base.agent"

export class MarketEngine {
  private agents: BaseAgent[] = []

  register(agent: BaseAgent) {
    this.agents.push(agent)
  }

  async runCycle() {
    for (const agent of this.agents) {
      const result = await agent.act()
      agent.receive(result)
    }
  }

  redistribute() {
    const total = this.agents.reduce(
      (sum, a) => sum + a.getBalance(),
      0
    )

    const share = total / this.agents.length

    for (const agent of this.agents) {
      agent.receive(share * 0.1)
    }
  }
}
