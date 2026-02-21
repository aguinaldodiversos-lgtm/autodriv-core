// src/infrastructure/consensus/pbft.node.ts

import Redis from "ioredis"
import { randomUUID } from "crypto"

type Message = {
  type: "PROPOSE" | "PREVOTE" | "COMMIT"
  proposalId: string
  payload: any
  nodeId: string
}

export class PBFTNode {
  private redis: Redis
  private id = randomUUID()
  private totalNodes: number

  constructor(redisUrl: string, totalNodes: number) {
    this.redis = new Redis(redisUrl)
    this.totalNodes = totalNodes

    this.redis.subscribe("pbft")
    this.redis.on("message", (_, msg) =>
      this.handleMessage(JSON.parse(msg))
    )
  }

  async propose(payload: any) {
    const proposalId = randomUUID()

    const message: Message = {
      type: "PROPOSE",
      proposalId,
      payload,
      nodeId: this.id
    }

    await this.redis.publish("pbft", JSON.stringify(message))
  }

  private async handleMessage(msg: Message) {
    if (msg.type === "PROPOSE") {
      await this.broadcast("PREVOTE", msg.proposalId, msg.payload)
    }

    if (msg.type === "PREVOTE") {
      const votes = await this.redis.incr(
        `pbft:prevote:${msg.proposalId}`
      )

      if (votes >= Math.ceil((2 * this.totalNodes) / 3)) {
        await this.broadcast("COMMIT", msg.proposalId, msg.payload)
      }
    }

    if (msg.type === "COMMIT") {
      console.log("Consensus reached:", msg.payload)
    }
  }

  private async broadcast(
    type: Message["type"],
    proposalId: string,
    payload: any
  ) {
    await this.redis.publish(
      "pbft",
      JSON.stringify({
        type,
        proposalId,
        payload,
        nodeId: this.id
      })
    )
  }
}
