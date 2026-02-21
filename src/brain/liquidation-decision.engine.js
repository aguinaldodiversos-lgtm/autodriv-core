// src/brain/liquidation-decision.engine.js

const db = require("../config/db")

class LiquidationDecisionEngine {
  async evaluate(tenantId) {
    const vehicles = await db.query(
      `SELECT id, entry_date
       FROM vehicles
       WHERE tenant_id = $1 AND status = 'available'`,
      [tenantId]
    )

    const now = new Date()

    return vehicles.rows
      .filter(v => {
        const dias =
          (now - new Date(v.entry_date)) /
          (1000*60*60*24)

        return dias > 90
      })
      .map(v => ({
        vehicleId: v.id,
        action: "liquidar_com_desconto_estrategico"
      }))
  }
}

module.exports = LiquidationDecisionEngine
