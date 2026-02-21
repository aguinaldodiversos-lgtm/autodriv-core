// src/ai/knowledge/exchange.mesh.ts

import Redis from "ioredis"
import crypto from "crypto"

export class KnowledgeExchangeMesh {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)
  }

  anonymize(data: any) {
    return {
      pattern: crypto
        .createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex"),
      metrics: data.metrics
    }
  }

  async publish(tenantId: string, data: any) {
    const anon = this.anonymize(data)
    await this.redis.publish(
      "knowledge_exchange",
      JSON.stringify(anon)
    )
  }

  subscribe(callback: (data: any) => void) {
    const sub = new Redis(this.redis.options)
    sub.subscribe("knowledge_exchange")
    sub.on("message", (_, msg) =>
      callback(JSON.parse(msg))
    )
  }
}
