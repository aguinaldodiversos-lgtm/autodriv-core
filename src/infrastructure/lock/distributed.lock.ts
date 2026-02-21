import { DatabaseClient } from "@/infrastructure/db/client"

export class DistributedLock {
  constructor(private db: DatabaseClient) {}

  async withLock<T>(
    key: string,
    callback: () => Promise<T>
  ): Promise<T | null> {
    const hash = this.hashKey(key)

    const acquired = await this.db.query({
      text: `SELECT pg_try_advisory_lock($1) as locked`,
      params: [hash],
    })

    if (!acquired[0]?.locked) {
      return null
    }

    try {
      return await callback()
    } finally {
      await this.db.query({
        text: `SELECT pg_advisory_unlock($1)`,
        params: [hash],
      })
    }
  }

  private hashKey(key: string): number {
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash)
  }
}
