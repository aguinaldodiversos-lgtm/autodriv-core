const axios = require("axios")

class TrendDetectionEngine {

  async analyze(keyword) {

    const response =
      await axios.get(
        `https://trends.googleapis.com/trends/api/dailytrends?hl=pt-BR`
      )

    return {
      keyword,
      tendenciaAlta:
        response.data.includes(keyword)
    }
  }
}

module.exports = TrendDetectionEngine
