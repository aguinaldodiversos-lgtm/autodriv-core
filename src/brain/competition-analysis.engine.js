const axios = require("axios")

class CompetitionAnalysisEngine {

  async analyze(model) {

    // Exemplo simplificado usando API pública fictícia
    const response = await axios.get(
      `https://api.exemplo-mercado.com/search?model=${model}`
    )

    const concorrentes = response.data

    const precoMedio =
      concorrentes.reduce((sum,c)=>sum+c.price,0) /
      concorrentes.length

    return {
      totalConcorrentes: concorrentes.length,
      precoMedioMercado: precoMedio
    }
  }
}

module.exports = CompetitionAnalysisEngine
