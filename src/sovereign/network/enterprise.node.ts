// src/sovereign/network/enterprise.node.ts

import Redis from "ioredis"
import { randomUUID } from "crypto"

export interface EnterpriseIdentity {
  id: string
  region: string
  capabilities: string[]
}

export class SovereignEnterpriseNode {
  private redis: Redis
  private identity: EnterpriseIdentity

  constructor(redisUrl: string, region: string) {
    this.redis = new Redis(redisUrl)

    this.identity = {
      id: randomUUID(),
      region,
      capabilities: []
    }

    this.register()
  }

  async register() {
    await this.redis.hset(
      "sovereign:network",
      this.identity.id,
      JSON.stringify(this.identity)
    )
  }

  async discover() {
    const nodes = await this.redis.hgetall(
      "sovereign:network"
    )

    return Object.values(nodes).map(n =>
      JSON.parse(n)
    )
  }

  addCapability(cap: string) {
    this.identity.capabilities.push(cap)
  }

  getIdentity() {
    return this.identity
  }
}
