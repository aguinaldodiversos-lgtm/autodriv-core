class CACForecastEngine {

  predict(campaigns) {

    return campaigns.map(c => {

      const tendencia =
        c.leads > 0
          ? c.cac / c.leads
          : c.cac

      return {
        campaign: c.campaign,
        cacPrevisto: c.cac + tendencia
      }
    })
  }
}

module.exports = CACForecastEngine
