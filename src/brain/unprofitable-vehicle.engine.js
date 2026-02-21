// src/brain/unprofitable-vehicle.engine.js

const db = require("../config/db")
const VehicleSaleProbabilityEngine = require("./vehicle-sale-probability.engine")

class UnprofitableVehicleEngine {

  constructor() {
    this.prob = new VehicleSaleProbabilityEngine()
  }

  async evaluate(tenantId) {

    const vehicles = await db.query(
      `SELECT id, price, cost, entry_date
       FROM vehicles
       WHERE tenant_id = $1 AND status = 'available'`,
      [tenantId]
    )

    const now = new Date()
    const desligar = []

    for (const v of vehicles.rows) {

      const margem = v.price - v.cost
      const dias =
        (now - new Date(v.entry_date)) /
        (1000*60*60*24)

      const prob = await this.prob.score(v.id, tenantId)

      if (
        margem < 2000 &&
        dias > 60 &&
        prob < 40
      ) {
        desligar.push({
          vehicleId: v.id,
          action: "PAUSAR_ANUNCIO"
        })
      }
    }

    return desligar
  }
}

module.exports = UnprofitableVehicleEngine
