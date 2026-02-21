class CrossChannelOptimizer {

  optimize(attribution, totalBudget) {

    const sorted = attribution.sort(
      (a, b) => b.attributionScore - a.attributionScore
    )

    return sorted.map(channel => ({
      source: channel.source,
      suggestedBudget:
        totalBudget * channel.attributionScore
    }))
  }
}

module.exports = CrossChannelOptimizer
