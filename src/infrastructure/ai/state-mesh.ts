import Redis from "ioredis"

export class AIStateMesh {
  private pub: Redis
  private sub: Redis
  private state: Record<string, any> = {}

  constructor(redisUrl: string) {
    this.pub = new Redis(redisUrl)
    this.sub = new Redis(redisUrl)

    this.sub.subscribe("ai_state_mesh")

    this.sub.on("message", (_, message) => {
      const { key, value } = JSON.parse(message)
      this.state[key] = value
    })
  }

  async update(key: string, value: any) {
    this.state[key] = value
    await this.pub.publish(
      "ai_state_mesh",
      JSON.stringify({ key, value })
    )
  }

  get(key: string) {
    return this.state[key]
  }
}
