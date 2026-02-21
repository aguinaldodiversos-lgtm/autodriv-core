// src/brain/vehicle-sale-probability.engine.js

const db = require("../config/db")

class VehicleSaleProbabilityEngine {
  async score(vehicleId, tenantId) {
    const dados = await db.query(
      `SELECT price, views, leads, entry_date
       FROM vehicles
       WHERE id = $1 AND tenant_id = $2`,
      [vehicleId, tenantId]
    )

    const v = dados.rows[0]
    if (!v) return null

    const dias =
      (new Date() - new Date(v.entry_date)) /
      (1000*60*60*24)

    let score = 50

    score += (v.leads || 0) * 5
    score += (v.views || 0) * 0.1
    score -= dias * 0.3

    return Math.max(0, Math.min(100, score))
  }
}

module.exports = VehicleSaleProbabilityEngine
