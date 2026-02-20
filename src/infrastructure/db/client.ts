// src/infrastructure/db/client.ts

export interface QueryParams {
  text: string
  params?: any[]
}

export interface TransactionClient {
  query<T = any>(query: QueryParams): Promise<T[]>
}

export interface DatabaseClient {
  query<T = any>(query: QueryParams): Promise<T[]>
  transaction<T>(callback: (trx: TransactionClient) => Promise<T>): Promise<T>
}
