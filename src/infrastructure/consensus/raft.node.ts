// src/infrastructure/consensus/raft.node.ts

import Redis from "ioredis"
import { randomUUID } from "crypto"

type Role = "leader" | "follower" | "candidate"

export class RaftNode {
  private redis: Redis
  private id = randomUUID()
  private role: Role = "follower"
  private term = 0
  private votedFor: string | null = null
  private heartbeatInterval?: NodeJS.Timeout
  private electionTimeout?: NodeJS.Timeout

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)
    this.startElectionTimer()
  }

  private startElectionTimer() {
    this.electionTimeout = setTimeout(() => {
      this.becomeCandidate()
    }, 3000 + Math.random() * 2000)
  }

  private async becomeCandidate() {
    this.role = "candidate"
    this.term++
    this.votedFor = this.id

    const votes = await this.redis.incr(`raft:term:${this.term}`)

    if (votes > 1) {
      this.becomeLeader()
    } else {
      this.startElectionTimer()
    }
  }

  private becomeLeader() {
    this.role = "leader"

    this.heartbeatInterval = setInterval(() => {
      this.redis.set("raft:leader", this.id)
    }, 1000)
  }

  isLeader() {
    return this.role === "leader"
  }
}
