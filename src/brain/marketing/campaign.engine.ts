// src/brain/marketing/campaign.engine.ts
// Motor de superinteligência de marketing — analisa e distribui orçamento

import { ChannelIntelligenceCore } from "./channel.core"
import { logger } from "@/infrastructure/logger/logger"

export interface CampaignData {
  id:       string
  campaign: string
  roi:      number
  ltv:      number
  visitas:  number
  cac:      number
  spend:    number
}

export interface CampaignAllocation {
  campaign:        string
  currentSpend:    number
  suggestedBudget: number
  unifiedScore:    number
  action:          string
}

export class MarketingSuperEngine {

  private channelCore = new ChannelIntelligenceCore()

  async execute(
    tenantId: string,
    totalBudget: number,
    campaigns: CampaignData[] = []
  ): Promise<CampaignAllocation[]> {

    if (campaigns.length === 0) {
      logger.warn(`📊 Nenhuma campanha encontrada para tenant ${tenantId}`)
      return []
    }

    // Pontuar cada campanha
    const scored = campaigns.map(c => ({
      ...c,
      unifiedScore: this.channelCore.evaluate({
        roi:       c.roi,
        ltv:       c.ltv,
        visitRate: c.visitas,
        cac:       c.cac
      })
    }))

    // Ordenar por score decrescente
    const ordered = scored.sort((a, b) => b.unifiedScore - a.unifiedScore)

    const totalScore = ordered.reduce((sum, c) => sum + c.unifiedScore, 0) || 1

    logger.info(
      `📈 Marketing Engine | tenant: ${tenantId} | ${campaigns.length} campanhas | budget: R$ ${totalBudget}`
    )

    return ordered.map(c => {
      const rank = this.channelCore.rank({
        roi:       c.roi,
        ltv:       c.ltv,
        visitRate: c.visitas,
        cac:       c.cac
      })

      return {
        campaign:        c.campaign,
        currentSpend:    c.spend,
        suggestedBudget: totalBudget * (c.unifiedScore / totalScore),
        unifiedScore:    c.unifiedScore,
        action:          rank.action
      }
    })
  }
}
