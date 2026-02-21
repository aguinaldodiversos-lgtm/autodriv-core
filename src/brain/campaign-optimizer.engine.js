class CampaignOptimizerEngine {

  optimize(campaigns) {

    return campaigns.map(c => {

      if (c.roi < 0) {
        return {
          campaign: c.campaign,
          action: "PAUSAR"
        }
      }

      if (c.roi > 1.5) {
        return {
          campaign: c.campaign,
          action: "DOBRAR_INVESTIMENTO"
        }
      }

      return {
        campaign: c.campaign,
        action: "MANTER"
      }
    })
  }
}

module.exports = CampaignOptimizerEngine
