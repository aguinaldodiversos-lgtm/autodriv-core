const localAI = require("../infrastructure/ai/localAI.service")

class DiagnosticEngine {
  async generate(data) {
    const resumo = `
    A loja possui ${data.vendas} vendas no mês,
    ${data.estoque} veículos disponíveis,
    capital travado de ${data.capitalTravado}.
    Risco financeiro: ${data.risco}.
    `

    try {
      const analysis = await localAI.classify(resumo)

      return {
        resumo,
        sentimentoOperacional: analysis[0]
      }
    } catch {
      return { resumo }
    }
  }
}

module.exports = DiagnosticEngine
