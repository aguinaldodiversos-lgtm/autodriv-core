// CommonJS: avalia vehicle/lead/channel brutos. O .ts homónimo recebe scores já agregados (plataforma TS).

const VehicleCore = require("./vehicle-intelligence.core")
const LeadCore = require("./lead-intelligence.core")
const ChannelCore = require("./channel-intelligence.core")

class RevenueIntelligenceCore {

  constructor() {
    this.vehicleCore = new VehicleCore()
    this.leadCore = new LeadCore()
    this.channelCore = new ChannelCore()
  }

  async evaluateSystem(data) {

    const vehicleScore =
      await this.vehicleCore.evaluate(data.vehicle)

    const leadScore =
      this.leadCore.evaluate(data.lead)

    const channelScore =
      this.channelCore.evaluate(data.channel)

    return {
      vehicleScore,
      leadScore,
      channelScore,
      globalHealth:
        (vehicleScore * 0.4) +
        (leadScore * 0.3) +
        (channelScore * 0.3)
    }
  }
}

module.exports = RevenueIntelligenceCore
