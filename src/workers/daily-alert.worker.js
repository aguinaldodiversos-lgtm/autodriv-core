// src/workers/daily-alert.worker.js

const ExecutiveReport = require('../brain/executive-report.engine')
const db = require('../config/db')

async function runDailyAlerts() {
  const tenants = await db.query('SELECT id FROM dealerships')

  for (const t of tenants.rows) {
    const reportEngine = new ExecutiveReport()
    const report = await reportEngine.generate(t.id)

    if (report.resumo.diasMediosEstoque > 60) {
      console.log(`🚨 ALERTA: Estoque alto na loja ${t.id}`)
    }

    const piorCanal = report.canais.sort((a, b) => a.roi - b.roi)[0]

    if (piorCanal && piorCanal.roi < 0) {
      console.log(`🚨 ALERTA: Canal ${piorCanal.source} está queimando dinheiro`)
    }
  }
}

module.exports = runDailyAlerts

if (require.main === module) {
  require('dotenv').config()
  runDailyAlerts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
