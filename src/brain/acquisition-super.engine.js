const AttributionEngine = require("./attribution.engine")
const CrossChannelOptimizer = require("./cross-channel-optimizer.engine")
const ChannelLTVEngine = require("./channel-ltv.engine")
const BiddingEngine = require("./bidding.engine")

class AcquisitionSuperEngine {

  constructor() {
    this.attribution = new AttributionEngine()
    this.cross = new CrossChannelOptimizer()
    this.ltv = new ChannelLTVEngine()
    this.bidding = new BiddingEngine()
  }

  async execute(tenantId, totalBudget) {

    const attribution = await this.attribution.calculate(tenantId)
    const allocation = this.cross.optimize(attribution, totalBudget)
    const ltvData = await this.ltv.calculate(tenantId)

    const bidding = ltvData.map(channel =>
      this.bidding.calculate({
        ltv: channel.ltvMedio,
        taxaConversao: 0.05
      })
    )

    return {
      attribution,
      allocation,
      ltvData,
      bidding
    }
  }
}

module.exports = AcquisitionSuperEngine
