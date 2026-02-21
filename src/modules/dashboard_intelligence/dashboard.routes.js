const express = require("express")
const router = express.Router()
const GeneralManagerAI = require("../../brain/general-manager.ai")

router.get("/executive/:tenantId", async (req, res) => {
  try {
    const gm = new GeneralManagerAI()
    const report = await gm.generateDailyExecutiveReport(
      req.params.tenantId
    )

    res.json(report)
  } catch (error) {
    res.status(500).json({
      error: "Falha ao gerar relatório executivo"
    })
  }
})

module.exports = router
