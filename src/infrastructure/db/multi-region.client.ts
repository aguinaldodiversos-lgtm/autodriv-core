// src/infrastructure/db/multi-region.client.ts

import { DatabaseClient, QueryParams } from "./client"
import { PostgresAdapter } from "./adapters/postgres.adapter"

interface RegionConfig {
  name: string
  write: boolean
  connectionString: string
}

export class MultiRegionDatabaseClient implements DatabaseClient {
  private regions: { name: string; client: PostgresAdapter; write: boolean }[]

  constructor(configs: RegionConfig[]) {
    this.regions = configs.map(r => ({
      name: r.name,
      write: r.write,
      client: new PostgresAdapter(r.connectionString)
    }))
  }

  private getWriter() {
    return this.regions.find(r => r.write)?.client
  }

  private getReader() {
    const readers = this.regions.filter(r => !r.write)
    return readers[Math.floor(Math.random() * readers.length)]?.client
  }

  async query<T = any>(query: QueryParams): Promise<T[]> {
    const isWrite = query.text.trim().toLowerCase().startsWith("insert") ||
                    query.text.trim().toLowerCase().startsWith("update") ||
                    query.text.trim().toLowerCase().startsWith("delete")

    const client = isWrite ? this.getWriter() : this.getReader() || this.getWriter()
    if (!client) throw new Error("No database region available")

    return client.query<T>(query)
  }

  async transaction<T>(callback: any): Promise<T> {
    const writer = this.getWriter()
    if (!writer) throw new Error("No write region available")
    return writer.transaction(callback)
  }
}
