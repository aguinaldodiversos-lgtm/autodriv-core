// src/application/use-cases/marketing/analyze-campaigns.usecase.ts

import { DatabaseClient }      from "@/infrastructure/db/client"
import { MarketingSuperEngine } from "@/brain/marketing/campaign.engine"

export class AnalyzeCampaignsUseCase {

  private engine = new MarketingSuperEngine()

  constructor(private db: DatabaseClient) {}

  async execute(dealershipId: string, totalBudget: number = 0) {

    const campaigns = await this.db.query<any>({
      text: `
        SELECT
          ac.id,
          ac.name       AS campaign,
          ac.platform,
          ac.budget     AS spend,
          COALESCE(ac.roi,    1.0) AS roi,
          COALESCE(ac.clicks, 0)   AS visitas,
          0                        AS ltv,
          COALESCE(ac.cpc,   50.0) AS cac
        FROM ads_campaigns ac
        WHERE ac.dealership_id = $1
          AND ac.status = 'active'
      `,
      params: [dealershipId]
    })

    const effectiveBudget = totalBudget > 0
      ? totalBudget
      : campaigns.reduce((sum: number, c: any) => sum + Number(c.spend), 0)

    const allocations = await this.engine.execute(
      dealershipId,
      effectiveBudget,
      campaigns
    )

    return {
      totalBudget:  effectiveBudget,
      campaignCount: campaigns.length,
      allocations
    }
  }
}
