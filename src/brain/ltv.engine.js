class LTVEngine {

  calculate(campaigns) {

    return campaigns.map(c => ({
      campaign: c.campaign,
      ltvPorVenda: c.ltv,
      ltvPorLead: c.leads > 0
        ? c.receita / c.leads
        : 0
    }))
  }
}

module.exports = LTVEngine
