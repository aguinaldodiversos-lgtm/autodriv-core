class IncrementalRevenueEngine {

  predict({
    leadsAdicionais,
    taxaConversao,
    ticketMedio
  }) {

    const vendasPrevistas =
      leadsAdicionais * taxaConversao

    const receitaIncremental =
      vendasPrevistas * ticketMedio

    return {
      vendasPrevistas,
      receitaIncremental
    }
  }
}

module.exports = IncrementalRevenueEngine
