// src/brain/price-elasticity.engine.js

const db = require("../config/db")

class PriceElasticityEngine {
  async evaluate(vehicleId, tenantId) {
    const dados = await db.query(
      `SELECT price, views, leads, created_at
       FROM vehicles
       WHERE id = $1 AND tenant_id = $2`,
      [vehicleId, tenantId]
    )

    const v = dados.rows[0]
    if (!v) return null

    const dias =
      (new Date() - new Date(v.created_at)) /
      (1000*60*60*24)

    const taxaConversao = (v.leads || 0) / (v.views || 1)

    let ajuste = 0

    if (dias > 45 && taxaConversao < 0.02) {
      ajuste = -0.05
    }

    if (taxaConversao > 0.08) {
      ajuste = 0.03
    }

    const novoPreco = v.price * (1 + ajuste)

    return {
      precoAtual: v.price,
      novoPreco,
      ajustePercentual: ajuste
    }
  }
}

module.exports = PriceElasticityEngine
