class ROIForecastEngine {

  forecast(campaigns) {

    return campaigns.map(c => {

      const crescimento =
        c.leads > 0
          ? (c.vendas / c.leads)
          : 0

      const roiPrevisto =
        c.roi + crescimento * 0.5

      return {
        campaign: c.campaign,
        roiPrevisto
      }
    })
  }
}

module.exports = ROIForecastEngine
