// src/brain/lead-intelligence.core.js

const UnifiedScore = require("./unified-score.model")

class LeadIntelligenceCore {

  constructor() {
    this.scoreModel = new UnifiedScore()
  }

  evaluate(data) {

    const unified =
      this.scoreModel.combine({
        lead: { value: data.leadScore, weight: 0.3 },
        visit: { value: data.visitScore, weight: 0.3 },
        attendance: { value: 100 - data.noShowRisk, weight: 0.2 },
        sale: { value: data.saleScore, weight: 0.2 }
      })

    return unified
  }
}

module.exports = LeadIntelligenceCore
