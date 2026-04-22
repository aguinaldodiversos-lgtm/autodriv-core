// src/application/use-cases/finance/get-summary.usecase.ts

import { DatabaseClient } from "@/infrastructure/db/client"

export interface FinanceSummary {
  totalIncome:    number
  totalExpenses:  number
  balance:        number
  pendingAmount:  number
  period: {
    month: number
    year:  number
  }
}

export class GetFinanceSummaryUseCase {

  constructor(private db: DatabaseClient) {}

  async execute(
    dealershipId: string,
    month: number = new Date().getMonth() + 1,
    year:  number = new Date().getFullYear()
  ): Promise<FinanceSummary> {

    const rows = await this.db.query<any>({
      text: `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income'  AND status = 'paid' THEN amount END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount END), 0) AS total_expenses,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0)                  AS pending_amount
        FROM financial_transactions
        WHERE dealership_id = $1
          AND EXTRACT(MONTH FROM created_at) = $2
          AND EXTRACT(YEAR  FROM created_at) = $3
      `,
      params: [dealershipId, month, year]
    })

    const row = rows[0] ?? {}

    return {
      totalIncome:   Number(row.total_income   ?? 0),
      totalExpenses: Number(row.total_expenses ?? 0),
      balance:       Number(row.total_income   ?? 0) - Number(row.total_expenses ?? 0),
      pendingAmount: Number(row.pending_amount ?? 0),
      period:        { month, year }
    }
  }
}
