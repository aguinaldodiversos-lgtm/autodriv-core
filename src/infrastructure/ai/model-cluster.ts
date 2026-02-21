// src/infrastructure/ai/model-cluster.ts

import Redis from "ioredis"

export class ModelCluster {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)
  }

  async registerNode(nodeId: string, capacity: number) {
    await this.redis.hset(
      "ai:model:nodes",
      nodeId,
      capacity
    )
  }

  async selectNode() {
    const nodes = await this.redis.hgetall(
      "ai:model:nodes"
    )

    const sorted = Object.entries(nodes).sort(
      (a, b) => Number(b[1]) - Number(a[1])
    )

    return sorted[0]?.[0] || null
  }

  async dispatchInference(
    nodeId: string,
    payload: any
  ) {
    await this.redis.publish(
      `ai:model:node:${nodeId}`,
      JSON.stringify(payload)
    )
  }
}
