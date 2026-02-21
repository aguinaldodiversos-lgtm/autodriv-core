class BiddingEngine {

  calculate({ ltv, taxaConversao }) {

    const valorMaximoLead = ltv * 0.15
    const bidIdeal = valorMaximoLead * taxaConversao

    return {
      bidSugerido: bidIdeal
    }
  }
}

module.exports = BiddingEngine
