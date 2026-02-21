class VisitDrivenBudgetEngine {

  allocate(channels, totalBudget) {

    const totalScore =
      channels.reduce(
        (sum,c)=>sum + c.taxaVisita,
        0
      )

    return channels.map(c => ({
      source: c.source,
      suggestedBudget:
        totalScore > 0
          ? totalBudget * (c.taxaVisita / totalScore)
          : totalBudget / channels.length
    }))
  }
}

module.exports = VisitDrivenBudgetEngine
