class BudgetAllocationEngine {

  allocate(campaigns, totalBudget) {

    const ordenado = campaigns.sort((a, b) => b.roi - a.roi)

    let restante = totalBudget
    const allocation = []

    for (const c of ordenado) {
      if (restante <= 0) break

      const peso = Math.max(0.1, c.roi + 1)
      const verba = (peso / ordenado.length) * totalBudget

      allocation.push({
        campaign: c.campaign,
        suggestedBudget: Math.min(verba, restante)
      })

      restante -= verba
    }

    return allocation
  }
}

module.exports = BudgetAllocationEngine
