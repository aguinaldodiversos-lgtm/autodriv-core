// src/infrastructure/ai/distributed.memory.ts

import Redis from "ioredis"

export class DistributedAIMemory {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)
  }

  async store(tenantId: string, key: string, value: any) {
    await this.redis.set(
      `ai_memory:${tenantId}:${key}`,
      JSON.stringify(value)
    )
  }

  async retrieve(tenantId: string, key: string) {
    const data = await this.redis.get(
      `ai_memory:${tenantId}:${key}`
    )
    return data ? JSON.parse(data) : null
  }

  async listKeys(tenantId: string) {
    return this.redis.keys(`ai_memory:${tenantId}:*`)
  }
}
