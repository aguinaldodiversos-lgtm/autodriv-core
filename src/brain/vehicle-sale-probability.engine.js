// src/brain/vehicle-sale-probability.engine.js

const db = require("../config/db")

class VehicleSaleProbabilityEngine {
  async score(vehicleId, tenantId) {
    if (vehicleId == null) return null

    const dados = await db.query(
      `SELECT price, entry_date, created_at
       FROM vehicles
       WHERE id = $1 AND dealership_id = $2`,
      [vehicleId, tenantId]
    )

    const v = dados.rows[0]
    if (!v) return null

    const ref = v.entry_date || v.created_at
    const dias = ref
      ? (Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24)
      : 0

    let score = 50
    score -= dias * 0.3
    const price = Number(v.price || 0)
    if (price > 0) score += Math.min(20, price / 50000)

    return Math.max(0, Math.min(100, score))
  }
}

module.exports = VehicleSaleProbabilityEngine
