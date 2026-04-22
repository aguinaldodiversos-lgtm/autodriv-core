// src/interfaces/http/controllers/marketing.controller.ts

import { Request, Response }           from "express"
import { AnalyzeCampaignsUseCase }     from "@/application/use-cases/marketing/analyze-campaigns.usecase"
import { DatabaseClient }              from "@/infrastructure/db/client"

export class MarketingController {

  constructor(private db: DatabaseClient) {}

  analyze = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const { totalBudget }   = req.query
      const useCase = new AnalyzeCampaignsUseCase(this.db)
      const result  = await useCase.execute(dealership_id, Number(totalBudget ?? 0))
      return res.json(result)
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  listCampaigns = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const campaigns = await this.db.query<any>({
        text: `
          SELECT * FROM ads_campaigns
          WHERE dealership_id = $1
          ORDER BY created_at DESC
        `,
        params: [dealership_id]
      })
      return res.json({ data: campaigns, total: campaigns.length })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }
}
