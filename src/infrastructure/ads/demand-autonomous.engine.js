const VehicleSelectionEngine = require("./vehicle-selection.engine")
const CreativeSaturationEngine = require("./creative-saturation.engine")
const AuctionBiddingEngine = require("./auction-bidding.engine")
const IncrementalRevenueEngine = require("./incremental-revenue.engine")

class DemandAutonomousEngine {

  constructor() {
    this.selector = new VehicleSelectionEngine()
    this.saturation = new CreativeSaturationEngine()
    this.bidding = new AuctionBiddingEngine()
    this.incremental = new IncrementalRevenueEngine()
  }

  async execute(tenantId, campaignMetrics) {

    const bestVehicle =
      await this.selector.select(tenantId)

    const saturation =
      this.saturation.evaluate(campaignMetrics)

    const bid =
      this.bidding.calculate(campaignMetrics)

    const incremental =
      this.incremental.predict(campaignMetrics)

    return {
      bestVehicle,
      saturation,
      bid,
      incremental
    }
  }
}

module.exports = DemandAutonomousEngine
