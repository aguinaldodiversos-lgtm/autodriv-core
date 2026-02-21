const db = require("../config/db")

class FutureTurnoverEngine {
  async forecast(tenantId) {
    const data = await db.query(
      `SELECT price, entry_date
       FROM vehicles
       WHERE tenant_id = $1 AND status = 'available'`,
      [tenantId]
    )

    const now = new Date()

    const previsao = {}

    data.rows.forEach(v => {
      const dias =
        (now - new Date(v.entry_date)) /
        (1000 * 60 * 60 * 24)

      const faixa =
        v.price < 50000 ? "popular" :
        v.price < 100000 ? "medio" :
        "premium"

      if (!previsao[faixa]) {
        previsao[faixa] = 0
      }

      if (dias < 30) previsao[faixa] += 0.8
      else if (dias < 60) previsao[faixa] += 0.5
      else previsao[faixa] += 0.2
    })

    return previsao
  }
}

module.exports = FutureTurnoverEngine
