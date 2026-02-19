const service = require("./approvalPanel.service");

async function getPanel(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const data = await service.getApprovalAnalysis(
      req.params.saleId,
      dealershipId
    );

    res.json(data);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  getPanel
};
