import { DatabaseClient } from "./client"
import { PostgresAdapter } from "./adapters/postgres.adapter"
import { D1Adapter } from "./adapters/d1.adapter"

export function createDatabaseClient(env: any): DatabaseClient {
  if (env.DB_TYPE === "postgres") {
    return new PostgresAdapter(env.DATABASE_URL)
  }

  if (env.DB_TYPE === "d1") {
    return new D1Adapter(env.DB)
  }

  throw new Error("Invalid DB_TYPE")
}
