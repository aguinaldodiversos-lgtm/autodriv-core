// src/interfaces/http/controllers/finance.controller.ts

import { Request, Response }          from "express"
import { CreateTransactionUseCase }   from "@/application/use-cases/finance/create-transaction.usecase"
import { GetFinanceSummaryUseCase }   from "@/application/use-cases/finance/get-summary.usecase"
import { DatabaseClient }             from "@/infrastructure/db/client"

export class FinanceController {

  constructor(private db: DatabaseClient) {}

  summary = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const { month, year } = req.query
      const useCase = new GetFinanceSummaryUseCase(this.db)
      const summary = await useCase.execute(
        dealership_id,
        month ? Number(month) : undefined,
        year  ? Number(year)  : undefined
      )
      return res.json(summary)
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  list = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const transactions = await this.db.query<any>({
        text: `
          SELECT * FROM financial_transactions
          WHERE dealership_id = $1
          ORDER BY created_at DESC
          LIMIT 100
        `,
        params: [dealership_id]
      })
      return res.json({ data: transactions, total: transactions.length })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  create = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const useCase = new CreateTransactionUseCase(this.db)
      const transaction = await useCase.execute(dealership_id, req.body)
      return res.status(201).json(transaction)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  pay = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      await this.db.query({
        text: `
          UPDATE financial_transactions
          SET status = 'paid', paid_at = NOW()
          WHERE id = $1 AND dealership_id = $2
        `,
        params: [req.params.id, dealership_id]
      })
      return res.json({ success: true })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }
}
