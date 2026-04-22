// src/read-models/channel.view.ts
// Read Model de canais de marketing — performance por canal

import { DatabaseClient }         from "@/infrastructure/db/client"
import { ChannelIntelligenceCore } from "@/brain/marketing/channel.core"

export interface ChannelPerformance {
  channel:      string
  platform:     string
  leads:        number
  conversions:  number
  spend:        number
  roi:          number
  score:        number
  tier:         "A" | "B" | "C" | "D"
  action:       string
}

export interface ChannelView {
  totalSpend:   number
  totalLeads:   number
  avgRoi:       number
  channels:     ChannelPerformance[]
  bestChannel:  string | null
  worstChannel: string | null
}

export class ChannelViewBuilder {

  private channelCore = new ChannelIntelligenceCore()

  constructor(private db: DatabaseClient) {}

  async build(dealershipId: string): Promise<ChannelView> {

    const campaigns = await this.db.query<any>({
      text: `
        SELECT
          ac.name       AS channel,
          ac.platform,
          ac.budget     AS spend,
          COALESCE(ac.roi,    1.0)  AS roi,
          COALESCE(ac.clicks, 0)    AS leads,
          COALESCE(ac.cpc,   50.0)  AS cac,
          0                          AS ltv
        FROM ads_campaigns ac
        WHERE ac.dealership_id = $1
        ORDER BY ac.created_at DESC
      `,
      params: [dealershipId]
    })

    const channels: ChannelPerformance[] = campaigns.map((c: any) => {
      const ranked = this.channelCore.rank({
        roi:       Number(c.roi),
        ltv:       Number(c.ltv ?? 0),
        visitRate: Number(c.leads) / 100,
        cac:       Number(c.cac)
      })

      return {
        channel:     c.channel,
        platform:    c.platform,
        leads:       Number(c.leads),
        conversions: 0,
        spend:       Number(c.spend),
        roi:         Number(c.roi),
        score:       ranked.score,
        tier:        ranked.tier,
        action:      ranked.action
      }
    })

    const totalSpend = channels.reduce((s, c) => s + c.spend, 0)
    const totalLeads = channels.reduce((s, c) => s + c.leads, 0)
    const avgRoi     = channels.length > 0
      ? channels.reduce((s, c) => s + c.roi, 0) / channels.length
      : 0

    const sorted = [...channels].sort((a, b) => b.score - a.score)

    return {
      totalSpend,
      totalLeads,
      avgRoi,
      channels,
      bestChannel:  sorted[0]?.channel  ?? null,
      worstChannel: sorted[sorted.length - 1]?.channel ?? null
    }
  }
}
