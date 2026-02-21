class DailyBudgetAdjustmentEngine {

  adjust(campaigns) {

    return campaigns.map(c => {

      let ajuste = 0

      if (c.roi > 1.2) ajuste = 0.20
      if (c.roi < 0) ajuste = -0.30

      return {
        campaign: c.campaign,
        ajustePercentual: ajuste
      }
    })
  }
}

module.exports = DailyBudgetAdjustmentEngine
