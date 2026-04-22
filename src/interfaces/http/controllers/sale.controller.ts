// src/interfaces/http/controllers/sale.controller.ts

import { Request, Response }    from "express"
import { CreateSaleUseCase }    from "@/application/use-cases/sale/create-sale.usecase"
import { DatabaseClient }       from "@/infrastructure/db/client"
import { EventBus }             from "@/infrastructure/event-bus/event.bus"

export class SaleController {

  constructor(
    private db:       DatabaseClient,
    private eventBus: EventBus
  ) {}

  list = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const sales = await this.db.query<any>({
        text: `
          SELECT s.*,
            v.brand, v.model, v.year,
            c.name AS client_name,
            u.name AS seller_name
          FROM sales s
          LEFT JOIN vehicles v ON v.id = s.vehicle_id
          LEFT JOIN clients  c ON c.id = s.client_id
          LEFT JOIN users    u ON u.id = s.user_id
          WHERE s.dealership_id = $1
          ORDER BY s.created_at DESC
        `,
        params: [dealership_id]
      })
      return res.json({ data: sales, total: sales.length })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  create = async (req: Request, res: Response) => {
    try {
      const { dealership_id, id: userId } = req.user as any
      const useCase = new CreateSaleUseCase(this.db, this.eventBus)
      const sale = await useCase.execute(dealership_id, { ...req.body, userId })
      return res.status(201).json(sale)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }
}
