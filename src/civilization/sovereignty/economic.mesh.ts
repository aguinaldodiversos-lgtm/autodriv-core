// src/civilization/sovereignty/economic.mesh.ts

import Redis from "ioredis"

export interface SovereignState {
  nodeId: string
  capitalReserve: number
  strategicBias: number
}

export class EconomicSovereigntyMesh {
  private redis: Redis
  private state: Record<string, SovereignState> = {}

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)
  }

  async register(state: SovereignState) {
    this.state[state.nodeId] = state

    await this.redis.hset(
      "sovereignty_mesh",
      state.nodeId,
      JSON.stringify(state)
    )
  }

  async rebalance() {
    const nodes = await this.redis.hgetall(
      "sovereignty_mesh"
    )

    const parsed = Object.values(nodes).map(n =>
      JSON.parse(n as string)
    )

    const total = parsed.reduce(
      (sum, n) => sum + n.capitalReserve,
      0
    )

    const average = total / parsed.length

    for (const n of parsed) {
      if (n.capitalReserve < average * 0.5) {
        n.capitalReserve += average * 0.1
      }
    }

    return parsed
  }
}
