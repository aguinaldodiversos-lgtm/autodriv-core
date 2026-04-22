// src/application/use-cases/finance/create-transaction.usecase.ts

import { randomUUID }     from "crypto"
import { DatabaseClient } from "@/infrastructure/db/client"

export type TransactionType     = "income" | "expense"
export type TransactionCategory =
  | "sale" | "commission" | "maintenance" | "marketing"
  | "salary" | "tax" | "rent" | "utility" | "other"

export interface CreateTransactionDTO {
  type:        TransactionType
  category:    TransactionCategory
  amount:      number
  description: string
  dueDate?:    Date
  saleId?:     string
  vehicleId?:  string
}

export class CreateTransactionUseCase {

  constructor(private db: DatabaseClient) {}

  async execute(dealershipId: string, data: CreateTransactionDTO) {

    const id  = randomUUID()
    const now = new Date()

    await this.db.query({
      text: `
        INSERT INTO financial_transactions
          (id, dealership_id, type, category, amount, description,
           due_date, sale_id, vehicle_id, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)
      `,
      params: [
        id, dealershipId, data.type, data.category,
        data.amount, data.description,
        data.dueDate ?? null, data.saleId ?? null,
        data.vehicleId ?? null, now
      ]
    })

    return {
      id,
      dealershipId,
      ...data,
      status: "pending",
      createdAt: now
    }
  }
}
