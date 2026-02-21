class AuctionBiddingEngine {

  calculate({
    ltv,
    margem,
    taxaConversaoEsperada,
    nivelCompeticao
  }) {

    const valorMaxLead =
      Math.min(ltv * 0.2, margem * 0.3)

    const bidBase =
      valorMaxLead * taxaConversaoEsperada

    const ajusteCompeticao =
      bidBase * (1 + nivelCompeticao)

    return {
      bidSugerido: ajusteCompeticao
    }
  }
}

module.exports = AuctionBiddingEngine
