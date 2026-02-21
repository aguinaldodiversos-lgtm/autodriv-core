const whatsapp = require("../modules/whatsapp/whatsapp.service")

class WhatsAppNotificationService {
  async sendExecutiveAlert(phone, report) {
    const message = `
📊 Relatório Executivo

Score Saúde: ${report.indicadores.healthScore}
Risco Financeiro: ${report.indicadores.riscoFinanceiro}

Recomendações:
${report.recomendacoes.join("\n")}
    `

    await whatsapp.sendMessage(phone, message)
  }
}

module.exports = WhatsAppNotificationService
