// src/brain/channel-intelligence.core.js

const UnifiedScore = require("./unified-score.model")

class ChannelIntelligenceCore {

  constructor() {
    this.scoreModel = new UnifiedScore()
  }

  evaluate(channelData) {

    return this.scoreModel.combine({
      roi: { value: channelData.roi * 50, weight: 0.4 },
      ltv: { value: channelData.ltv / 1000, weight: 0.2 },
      visit: { value: channelData.visitRate * 100, weight: 0.2 },
      cac: { value: 100 - channelData.cac, weight: 0.2 }
    })
  }
}

module.exports = ChannelIntelligenceCore
