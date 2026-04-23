import { DatabaseClient, QueryParams, TransactionClient } from "../client"

/** Binding mínimo D1 (Workers); tipos completos vêm de @cloudflare/workers-types no deploy CF. */
export interface D1Database {
  prepare(query: string): {
    bind(...params: unknown[]): { all(): Promise<{ results?: unknown[] }> }
    all(): Promise<{ results?: unknown[] }>
  }
}

export class D1Adapter implements DatabaseClient {
  constructor(private db: D1Database) {}

  async query<T = any>({ text, params }: QueryParams): Promise<T[]> {
    const stmt = this.db.prepare(text)

    const result = params?.length
      ? await stmt.bind(...params).all()
      : await stmt.all()

    return (result.results ?? []) as T[]
  }

  async transaction<T>(
    callback: (trx: TransactionClient) => Promise<T>
  ): Promise<T> {
    const trx: TransactionClient = {
      query: this.query.bind(this)
    }

    return callback(trx)
  }
}
