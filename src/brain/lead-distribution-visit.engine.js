// src/brain/lead-distribution-visit.engine.js

const SellerScheduleOptimizer = require("./seller-schedule-optimizer.engine")

class LeadDistributionVisitEngine {

  constructor() {
    this.optimizer = new SellerScheduleOptimizer()
  }

  async assign(tenantId) {

    const ranking =
      await this.optimizer.allocate(tenantId)

    return ranking[0] // melhor vendedor
  }
}

module.exports = LeadDistributionVisitEngine
