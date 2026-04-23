// src/brain/general-manager.ai.js

const db = require("../config/db")
const RevenueCore = require("./revenue-intelligence.core")
const HealthScoreEngine = require("./health-score.engine")
const FinancialRiskEngine = require("./financial-risk.engine")

class GeneralManagerAI {

  constructor() {
    this.revenue = new RevenueCore()
    this.health = new HealthScoreEngine()
    this.risk = new FinancialRiskEngine()
  }

  /**
   * Relatório executivo diário para uma loja (tenantId = dealership_id).
   * Monta tenantData a partir do banco e reutiliza generate().
   */
  async generateDailyExecutiveReport(tenantId) {
    const dealershipId = Number(tenantId)
    if (!Number.isFinite(dealershipId)) {
      throw new Error("tenantId inválido")
    }

    const tenantData = {
      tenantId: String(dealershipId),
      vehicle: {
        id: null,
        tenantId: dealershipId,
        price: 50000,
        cost: 40000,
        daysInStock: 30
      },
      lead: {
        leadScore: 50,
        visitScore: 50,
        noShowRisk: 20,
        saleScore: 50
      },
      channel: {
        roi: 0.45,
        ltv: 10000,
        visitRate: 0.3,
        cac: 40
      }
    }

    try {
      const vrow = await db.query(
        `SELECT id, price,
                COALESCE(entry_date, created_at) AS ref_date
         FROM vehicles
         WHERE dealership_id = $1
         ORDER BY id DESC
         LIMIT 1`,
        [dealershipId]
      )

      if (vrow.rows[0]) {
        const v = vrow.rows[0]
        const price = Number(v.price || 0)
        const days = Math.max(
          0,
          (Date.now() - new Date(v.ref_date).getTime()) / (1000 * 60 * 60 * 24)
        )
        tenantData.vehicle = {
          id: v.id,
          tenantId: dealershipId,
          price,
          cost: price > 0 ? price * 0.85 : 40000,
          daysInStock: Math.round(days)
        }
      }

      const lrow = await db.query(
        `SELECT COUNT(*)::int AS c FROM leads WHERE dealership_id = $1`,
        [dealershipId]
      )
      const lc = lrow.rows[0]?.c ?? 0
      tenantData.lead.leadScore = Math.min(100, 35 + Math.min(lc, 20) * 3)
      tenantData.lead.visitScore = Math.min(100, 40 + lc)
      tenantData.lead.saleScore = Math.min(100, 45 + lc)
    } catch (err) {
      console.error("GeneralManagerAI.generateDailyExecutiveReport:", err.message)
    }

    const executive = await this.generate(tenantData)
    const health = await this.health.calculate(dealershipId)

    return {
      generatedAt: new Date().toISOString(),
      dealershipId,
      ...executive,
      healthScoreDetail: health
    }
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
