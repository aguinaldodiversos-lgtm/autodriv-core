const express = require('express')
const router = express.Router()
const ExecutiveReport = require('../../../brain/executive-report.engine')

router.get('/executive/:tenantId', async (req, res) => {
  try {
    const engine = new ExecutiveReport()
    const report = await engine.generate(req.params.tenantId)

    res.json(report)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório' })
  }
})

module.exports = router
