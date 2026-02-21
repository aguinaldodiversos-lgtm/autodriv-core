// src/brain/general-manager.ai.js

const RevenueCore = require("./revenue-intelligence.core")
const HealthScoreEngine = require("./health-score.engine")
const FinancialRiskEngine = require("./financial-risk.engine")

class GeneralManagerAI {

  constructor() {
    this.revenue = new RevenueCore()
    this.health = new HealthScoreEngine()
    this.risk = new FinancialRiskEngine()
  }

  async generate(tenantData) {

    const revenueEvaluation =
      await this.revenue.evaluateSystem(tenantData)

    const health =
      await this.health.calculate(tenantData.tenantId)

    const risk =
      await this.risk.analyze(tenantData.tenantId)

    return {
      globalHealthScore:
        revenueEvaluation.globalHealth,

      vehicleScore:
        revenueEvaluation.vehicleScore,

      leadScore:
        revenueEvaluation.leadScore,

      channelScore:
        revenueEvaluation.channelScore,

      financialRisk: risk.risco,
      capitalTravado: risk.capitalTravado,
      vendasMensais: risk.vendasMensais
    }
  }
}

module.exports = GeneralManagerAI
