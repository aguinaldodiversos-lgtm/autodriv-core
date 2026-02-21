// src/sovereign/federation/federation.protocol.ts

import Redis from "ioredis"

export interface FederationMessage {
  fromNetwork: string
  payload: any
  signature: string
}

export class AIFederationProtocol {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)
  }

  async broadcast(network: string, payload: any) {
    const message: FederationMessage = {
      fromNetwork: network,
      payload,
      signature: this.sign(payload)
    }

    await this.redis.publish(
      "ai_federation",
      JSON.stringify(message)
    )
  }

  subscribe(handler: (msg: FederationMessage) => void) {
    const sub = new Redis(this.redis.options)
    sub.subscribe("ai_federation")

    sub.on("message", (_, msg) => {
      const parsed = JSON.parse(msg)
      if (this.verify(parsed)) {
        handler(parsed)
      }
    })
  }

  private sign(payload: any) {
    return Buffer.from(JSON.stringify(payload)).toString("base64")
  }

  private verify(msg: FederationMessage) {
    return !!msg.signature
  }
}
