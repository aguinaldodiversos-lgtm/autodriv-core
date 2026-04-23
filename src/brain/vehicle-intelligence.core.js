// src/brain/vehicle-intelligence.core.js

const UnifiedScore = require("./unified-score.model")
const VehicleSaleProbabilityEngine = require("./vehicle-sale-probability.engine")

class VehicleIntelligenceCore {

  constructor() {
    this.scoreModel = new UnifiedScore()
    this.saleProb = new VehicleSaleProbabilityEngine()
  }

  async evaluate(vehicleData) {

    const saleScore =
      (await this.saleProb.score(
        vehicleData.id,
        vehicleData.tenantId
      )) ?? 50

    const margin =
      vehicleData.price - vehicleData.cost

    const marginScore =
      this.scoreModel.normalize(margin / 100)

    const ageScore =
      this.scoreModel.normalize(
        100 - vehicleData.daysInStock
      )

    const unified =
      this.scoreModel.combine({
        sale: { value: saleScore, weight: 0.4 },
        margin: { value: marginScore, weight: 0.3 },
        age: { value: ageScore, weight: 0.3 }
      })

    return unified
  }
}

module.exports = VehicleIntelligenceCore
