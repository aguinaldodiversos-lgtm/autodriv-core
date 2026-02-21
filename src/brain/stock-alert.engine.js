const db = require("../config/db")

class StockAlertEngine {
  async check(tenantId) {
    const vehicles = await db.query(
      `SELECT id, entry_date FROM vehicles WHERE tenant_id = $1 AND status = 'available'`,
      [tenantId]
    )

    const now = new Date()

    const criticos = vehicles.rows.filter(v => {
      const dias =
        (now - new Date(v.entry_date)) /
        (1000 * 60 * 60 * 24)

      return dias > 75
    })

    return criticos.map(v => v.id)
  }
}

module.exports = StockAlertEngine
