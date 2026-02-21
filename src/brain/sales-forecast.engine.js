// src/brain/sales-forecast.engine.js

const db = require("../config/db")

class SalesForecastEngine {
  async forecast(tenantId) {
    const historico = await db.query(
      `SELECT DATE_TRUNC('month', created_at) as mes,
              COUNT(*) as vendas
       FROM sales
       WHERE tenant_id = $1
       AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY mes
       ORDER BY mes`,
      [tenantId]
    )

    const vendas = historico.rows.map(r => Number(r.vendas))
    const media = vendas.reduce((a,b)=>a+b,0) / (vendas.length || 1)

    const tendencia = vendas.length >= 2
      ? vendas[vendas.length - 1] - vendas[vendas.length - 2]
      : 0

    const forecast30 = Math.max(0, media + tendencia * 0.5)
    const forecast60 = forecast30 * 2
    const forecast90 = forecast30 * 3

    return {
      forecast30,
      forecast60,
      forecast90,
      mediaHistorica: media,
      tendencia
    }
  }
}

module.exports = SalesForecastEngine
