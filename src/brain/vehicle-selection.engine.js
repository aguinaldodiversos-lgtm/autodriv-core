const VehicleSaleProbabilityEngine = require("./vehicle-sale-probability.engine")
const db = require("../config/db")

class VehicleSelectionEngine {

  constructor() {
    this.probEngine = new VehicleSaleProbabilityEngine()
  }

  async select(tenantId) {

    const vehicles = await db.query(
      `SELECT id, price, cost, entry_date
       FROM vehicles
       WHERE tenant_id = $1 AND status = 'available'`,
      [tenantId]
    )

    const ranking = []

    for (const v of vehicles.rows) {

      const prob = await this.probEngine.score(v.id, tenantId)

      const margem = v.price - v.cost

      const dias =
        (new Date() - new Date(v.entry_date)) /
        (1000 * 60 * 60 * 24)

      const score =
        (prob * 0.5) +
        (margem * 0.001) -
        (dias * 0.3)

      ranking.push({
        vehicleId: v.id,
        score
      })
    }

    return ranking.sort((a,b)=>b.score - a.score)[0]
  }
}

module.exports = VehicleSelectionEngine
