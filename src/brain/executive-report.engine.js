// src/brain/executive-report.engine.js

const StockEngine = require('./stock.engine')
const AcquisitionEngine = require('./acquisition.engine')
const db = require('../config/db')

class ExecutiveReportEngine {
  async generate(tenantId) {
    const stock = new StockEngine(db)
    const acquisition = new AcquisitionEngine(db)

    const stockData = await stock.analyze(tenantId)
    const acquisitionData = await acquisition.analyze(tenantId)

    return {
      resumo: {
        diasMediosEstoque: stockData.diasMediosEstoque,
        capitalTravado: stockData.capitalTravado
      },
      estoqueCritico: stockData.sugestaoDesova,
      canais: acquisitionData,
      geradoEm: new Date()
    }
  }
}

module.exports = ExecutiveReportEngine
