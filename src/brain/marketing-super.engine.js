const ChannelCore = require("./channel-intelligence.core")
const MarketingIntelligenceEngine = require("./marketing-intelligence.engine")

class MarketingSuperEngine {

  constructor() {
    this.intel = new MarketingIntelligenceEngine()
    this.channelCore = new ChannelCore()
  }

  async execute(tenantId, totalBudget) {

    const campaigns =
      await this.intel.analyze(tenantId)

    const scored = campaigns.map(c => ({
      ...c,
      unifiedScore:
        this.channelCore.evaluate({
          roi: c.roi,
          ltv: c.ltv,
          visitRate: c.visitas || 0,
          cac: c.cac
        })
    }))

    const ordered =
      scored.sort((a,b)=>b.unifiedScore - a.unifiedScore)

    return ordered.map(c => ({
      campaign: c.campaign,
      suggestedBudget:
        totalBudget * (c.unifiedScore / 100)
    }))
  }
}

module.exports = MarketingSuperEngine
