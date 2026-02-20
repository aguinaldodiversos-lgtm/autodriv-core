import { Pool, PoolClient } from "pg"
import { DatabaseClient, QueryParams, TransactionClient } from "../client"

export class PostgresAdapter implements DatabaseClient {
  private pool: Pool

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString })
  }

  async query<T = any>({ text, params }: QueryParams): Promise<T[]> {
    const result = await this.pool.query(text, params)
    return result.rows
  }

  async transaction<T>(
    callback: (trx: TransactionClient) => Promise<T>
  ): Promise<T> {
    const client: PoolClient = await this.pool.connect()

    try {
      await client.query("BEGIN")

      const trx: TransactionClient = {
        query: async <T = any>({ text, params }: QueryParams) => {
          const result = await client.query(text, params)
          return result.rows
        },
      }

      const result = await callback(trx)

      await client.query("COMMIT")
      return result
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
  }
}
