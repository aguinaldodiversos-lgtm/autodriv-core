// src/ai/sovereign/sovereign.node.ts

import Redis from "ioredis"

export class SovereignAINode {
  private redis: Redis
  private localState: Record<string, any> = {}

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)

    this.redis.subscribe("sovereign_sync")
    this.redis.on("message", (_, msg) => {
      const update = JSON.parse(msg)
      this.localState[update.key] = update.value
    })
  }

  async updateState(key: string, value: any) {
    this.localState[key] = value
    await this.redis.publish(
      "sovereign_sync",
      JSON.stringify({ key, value })
    )
  }

  getState(key: string) {
    return this.localState[key]
  }
}
