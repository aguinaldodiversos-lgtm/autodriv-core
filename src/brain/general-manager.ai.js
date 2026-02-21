// src/brain/general-manager.ai.js

const HealthScoreEngine = require("./health-score.engine")
const FinancialRiskEngine = require("./financial-risk.engine")
const StockAlertEngine = require("./stock-alert.engine")
const DiagnosticEngine = require("./diagnostic.engine")
const RecommendationEngine = require("./recommendation.engine")
const AcquisitionEngine = require("./acquisition.engine")

class GeneralManagerAI {
  constructor() {
    this.healthEngine = new HealthScoreEngine()
    this.riskEngine = new FinancialRiskEngine()
    this.stockAlertEngine = new StockAlertEngine()
    this.diagnosticEngine = new DiagnosticEngine()
    this.recommendationEngine = new RecommendationEngine()
    this.acquisitionEngine = new AcquisitionEngine()
  }

  async generateDailyExecutiveReport(tenantId) {
    const startedAt = Date.now()

    try {
      // 1️⃣ Saúde da loja
      const health = await this.healthEngine.calculate(tenantId)

      // 2️⃣ Risco financeiro
      const riskData = await this.riskEngine.analyze(tenantId)

      // 3️⃣ Estoque crítico
      const estoqueCritico = await this.stockAlertEngine.check(tenantId)

      // 4️⃣ Performance de canais
      const canais = await this.acquisitionEngine.analyze(tenantId)

      const piorCanal = canais.length
        ? canais.sort((a, b) => a.roi - b.roi)[0]
        : null

      // 5️⃣ Diagnóstico inteligente
      const diagnostic = await this.diagnosticEngine.generate({
        vendas: health.vendas,
        estoque: health.estoque,
        capitalTravado: health.capitalTravado,
        risco: riskData.risco
      })

      // 6️⃣ Recomendações executivas
      const recomendacoes = this.recommendationEngine.generate({
        risco: riskData.risco,
        estoqueCritico,
        piorCanal
      })

      const executionTime = Date.now() - startedAt

      return {
        meta: {
          tenantId,
          geradoEm: new Date(),
          tempoProcessamentoMs: executionTime
        },

        indicadores: {
          healthScore: health.healthScore,
          riscoFinanceiro: riskData.risco,
          capitalTravado: riskData.capitalTravado,
          vendasMensais: riskData.vendasMensais
        },

        alertas: {
          estoqueCritico,
          canalQueQueimaCaixa: piorCanal?.roi < 0 ? piorCanal : null
        },

        diagnostico: diagnostic.resumo,
        sentimentoOperacional: diagnostic.sentimentoOperacional || null,

        recomendacoes
      }

    } catch (error) {
      console.error("Erro no GeneralManagerAI:", error)

      return {
        error: true,
        message: "Falha ao gerar relatório executivo",
        detalhes: error.message
      }
    }
  }
}

module.exports = GeneralManagerAI
