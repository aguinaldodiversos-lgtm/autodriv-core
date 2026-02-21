const express = require("express")
const router = express.Router()
const GeneralManagerAI = require("../../brain/general-manager.ai")

router.get("/global/:tenantId", async (req, res) => {

  const tenantId = req.params.tenantId

  const tenantData = {
    tenantId,
    vehicle: req.query.vehicleData,
    lead: req.query.leadData,
    channel: req.query.channelData
  }

  const gm = new GeneralManagerAI()

  const report = await gm.generate(tenantData)

  res.json(report)
})

module.exports = router
