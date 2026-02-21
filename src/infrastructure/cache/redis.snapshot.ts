import Redis from "ioredis"

export class RedisSnapshotCache {
  private redis: Redis

  constructor(url: string) {
    this.redis = new Redis(url)
  }

  async save(engine: string, tenantId: string, state: any) {
    const key = `snapshot:${engine}:${tenantId}`
    await this.redis.set(key, JSON.stringify(state))
  }

  async load(engine: string, tenantId: string) {
    const key = `snapshot:${engine}:${tenantId}`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data) : null
  }
}
