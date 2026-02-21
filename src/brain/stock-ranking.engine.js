// src/brain/stock-ranking.engine.js

const VehicleSaleProbabilityEngine = require("./vehicle-sale-probability.engine")
const db = require("../config/db")

class StockRankingEngine {
  constructor() {
    this.probEngine = new VehicleSaleProbabilityEngine()
  }

  async rank(tenantId) {
    const vehicles = await db.query(
      `SELECT id FROM vehicles
       WHERE tenant_id = $1 AND status = 'available'`,
      [tenantId]
    )

    const ranking = []

    for (const v of vehicles.rows) {
      const score = await this.probEngine.score(v.id, tenantId)
      ranking.push({ vehicleId: v.id, score })
    }

    return ranking.sort((a,b)=>b.score - a.score)
  }
}

module.exports = StockRankingEngine
