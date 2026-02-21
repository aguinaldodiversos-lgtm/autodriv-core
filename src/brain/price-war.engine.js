const CompetitionAnalysisEngine = require("./competition-analysis.engine")
const db = require("../config/db")

class PriceWarEngine {

  constructor() {
    this.competition = new CompetitionAnalysisEngine()
  }

  async evaluate(vehicleId, tenantId) {

    const vehicle = await db.query(
      `SELECT price, model
       FROM vehicles
       WHERE id = $1 AND tenant_id = $2`,
      [vehicleId, tenantId]
    )

    const v = vehicle.rows[0]

    const mercado =
      await this.competition.analyze(v.model)

    if (v.price > mercado.precoMedioMercado) {

      return {
        action: "REDUZIR_PRECO",
        novoPreco:
          mercado.precoMedioMercado * 0.99
      }
    }

    return { action: "MANTER" }
  }
}

module.exports = PriceWarEngine
