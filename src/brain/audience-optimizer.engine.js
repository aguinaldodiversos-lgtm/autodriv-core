class AudienceOptimizerEngine {

  optimize({ idadeMedia, faixaRenda, taxaConversao }) {

    let ajuste = {}

    if (taxaConversao < 0.03) {
      ajuste.expandirPublico = true
    }

    if (taxaConversao > 0.08) {
      ajuste.nichoSemelhante = true
    }

    ajuste.faixaEtariaSugerida = [
      idadeMedia - 5,
      idadeMedia + 5
    ]

    return ajuste
  }
}

module.exports = AudienceOptimizerEngine
